# Desktop Agent Changelog

## [0.2.0] - 2026-06-29

### Features

- **Morpho Blue execution** — `MorphoFlashLiquidator.sol` uses zero-fee Morpho flash loans for atomic liquidations with Uniswap V3 swap-back
- **Protocol-routed executor** — `FlashLiquidationExecutor` dispatches to Aave or Morpho contracts by `protocol_id`
- **Live swap quotes** — KyberSwap aggregator (default) and optional 1inch API for profit estimation
- **Morpho scanner** — GraphQL discovery with `borrowShares`, oracle, IRM, and LLTV; executable when `MORPHO_FLASH_LIQUIDATOR_ADDRESS` is set
- **Multi-protocol scanning** — Aave V3, Moonwell, Compound V3, and Morpho Blue on Base mainnet
- **Profit layer** — urgency scoring, watch list, oracle monitor, slippage-aware profit, simulation gate

### Tooling

- `python scripts/deploy_contract.py --morpho` deploys `MorphoFlashLiquidator`
- Unit tests in `tests/` for profit engine, swap quotes, and executor calldata encoding

### Notes

- Monorepo `typescript/` and `python/` SDK READMEs are unchanged — this application lives under `desktop-agent/` only.

## [0.1.0] - 2026-06-29

### Features

- Initial CDP Flash Liquidation Desktop Agent for Base mainnet
- `FlashLiquidator.sol` for Aave V3 flash-loan liquidations
- CDP Smart Account + paymaster integration
- Live dashboard on port 8787
