"""AI decision layer — Web3 expert reasoning over liquidation opportunities."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import aiohttp

from agent.scanner import LiquidationTarget
from config.settings import AgentSettings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior Web3 and Coinbase CDP engineer specializing in:
- Aave V3 flash-loan liquidations on Base mainnet
- CDP Smart Accounts with paymaster gas sponsorship
- Atomic multibatch arbitrage and MEV-safe execution

Given liquidation candidates, respond ONLY with JSON:
{
  "action": "execute" | "skip" | "watch",
  "target_user": "<address or null>",
  "reasoning": "<concise technical rationale>",
  "risk_flags": ["..."],
  "recommended_gas_strategy": "cdp_paymaster" | "self_funded"
}
"""


@dataclass
class AgentDecision:
    action: str
    target_user: str | None
    reasoning: str
    risk_flags: list[str]
    recommended_gas_strategy: str
    source: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "action": self.action,
            "target_user": self.target_user,
            "reasoning": self.reasoning,
            "risk_flags": self.risk_flags,
            "recommended_gas_strategy": self.recommended_gas_strategy,
            "source": self.source,
        }


class LiquidationAIEngine:
    """Rule-based expert engine with optional LLM augmentation."""

    def __init__(self, settings: AgentSettings) -> None:
        self.settings = settings

    async def decide(self, targets: list[LiquidationTarget]) -> AgentDecision:
        if not targets:
            return AgentDecision(
                action="watch",
                target_user=None,
                reasoning="No liquidatable positions above profit threshold.",
                risk_flags=[],
                recommended_gas_strategy="cdp_paymaster",
                source="rules",
            )

        if self.settings.anthropic_api_key:
            llm_decision = await self._anthropic_decide(targets)
            if llm_decision:
                return llm_decision

        if self.settings.openai_api_key:
            llm_decision = await self._openai_decide(targets)
            if llm_decision:
                return llm_decision

        return self._rules_decide(targets)

    def _rules_decide(self, targets: list[LiquidationTarget]) -> AgentDecision:
        best = targets[0]
        risk_flags: list[str] = []

        if best.health_factor > 0.98:
            risk_flags.append("health_factor_near_boundary")
        if best.collateral_symbol == best.debt_symbol:
            risk_flags.append("same_asset_pair_swap_unnecessary")
        if best.estimated_profit_usd < self.settings.min_profit_usd * 1.5:
            risk_flags.append("thin_margin")

        action = "execute" if not risk_flags or best.estimated_profit_usd > self.settings.min_profit_usd * 3 else "watch"

        return AgentDecision(
            action=action,
            target_user=best.user,
            reasoning=(
                f"HF={best.health_factor:.4f}, est. profit ${best.estimated_profit_usd:.2f} on "
                f"{best.collateral_symbol}/{best.debt_symbol} pair. Flash borrow "
                f"{best.debt_to_cover_human:.4f} {best.debt_symbol}."
            ),
            risk_flags=risk_flags,
            recommended_gas_strategy="cdp_paymaster",
            source="rules",
        )

    async def _openai_decide(self, targets: list[LiquidationTarget]) -> AgentDecision | None:
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps([t.to_dict() for t in targets[:5]], indent=2),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }
        return await self._call_llm(
            url="https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            payload=payload,
            source="openai",
        )

    async def _anthropic_decide(self, targets: list[LiquidationTarget]) -> AgentDecision | None:
        payload = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 512,
            "system": SYSTEM_PROMPT,
            "messages": [
                {
                    "role": "user",
                    "content": json.dumps([t.to_dict() for t in targets[:5]], indent=2),
                }
            ],
        }
        return await self._call_llm(
            url="https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            payload=payload,
            source="anthropic",
            anthropic=True,
        )

    async def _call_llm(
        self,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any],
        source: str,
        anthropic: bool = False,
    ) -> AgentDecision | None:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload, timeout=30) as resp:
                    if resp.status != 200:
                        logger.warning("LLM call failed: %s", await resp.text())
                        return None
                    data = await resp.json()

            if anthropic:
                content = data["content"][0]["text"]
            else:
                content = data["choices"][0]["message"]["content"]

            parsed = json.loads(content)
            return AgentDecision(
                action=parsed.get("action", "watch"),
                target_user=parsed.get("target_user"),
                reasoning=parsed.get("reasoning", ""),
                risk_flags=parsed.get("risk_flags", []),
                recommended_gas_strategy=parsed.get("recommended_gas_strategy", "cdp_paymaster"),
                source=source,
            )
        except Exception as exc:
            logger.warning("LLM decision fallback to rules: %s", exc)
            return None
