"""Desktop web dashboard for the liquidation agent."""

from __future__ import annotations

import asyncio
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

from agent.ai_engine import AgentDecision
from agent.models import LiquidationTarget

app = FastAPI(title="CDP Flash Liquidation Agent", version="1.0.0")

_state: dict[str, Any] = {
    "status": "initializing",
    "network": "",
    "smart_account": "",
    "enabled_protocols": [],
    "targets": [],
    "decision": None,
    "last_execution": None,
    "logs": [],
    "scan_count": 0,
}


def push_log(message: str) -> None:
    _state["logs"] = ([message] + _state["logs"])[:200]


def update_state(**kwargs: Any) -> None:
    _state.update(kwargs)


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return DASHBOARD_HTML


@app.get("/api/status")
async def status() -> JSONResponse:
    return JSONResponse(_state)


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "agent_status": _state["status"]})


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CDP Flash Liquidation Agent</title>
  <style>
    :root {
      --bg: #0b0f14;
      --panel: #121820;
      --accent: #0052ff;
      --green: #3dd68c;
      --red: #ff5c5c;
      --text: #e8edf5;
      --muted: #8b98a8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: "IBM Plex Sans", system-ui, sans-serif;
      background: radial-gradient(circle at 10% 10%, #142033, var(--bg));
      color: var(--text); min-height: 100vh;
    }
    header {
      padding: 1.25rem 2rem; border-bottom: 1px solid #1f2a3a;
      display: flex; justify-content: space-between; align-items: center;
    }
    h1 { margin: 0; font-size: 1.2rem; letter-spacing: 0.02em; }
    .badge {
      background: #1a2740; color: var(--green); padding: 0.35rem 0.75rem;
      border-radius: 999px; font-size: 0.8rem; font-weight: 600;
    }
    main { padding: 1.5rem 2rem; display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
    .panel {
      background: var(--panel); border: 1px solid #1f2a3a; border-radius: 12px;
      padding: 1rem 1.25rem; box-shadow: 0 8px 30px rgba(0,0,0,0.25);
    }
    .panel h2 { margin: 0 0 0.75rem; font-size: 0.95rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .full { grid-column: 1 / -1; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #1f2a3a; }
    th { color: var(--muted); font-weight: 500; }
    .profit { color: var(--green); font-weight: 600; }
    .hf-bad { color: var(--red); font-weight: 600; }
    pre {
      background: #0a1018; padding: 0.75rem; border-radius: 8px;
      overflow: auto; max-height: 220px; font-size: 0.78rem; color: #b8c7da;
    }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .meta div { background: #0a1018; border-radius: 8px; padding: 0.75rem; }
    .meta label { display: block; color: var(--muted); font-size: 0.72rem; margin-bottom: 0.25rem; }
    .meta span { font-family: monospace; font-size: 0.8rem; word-break: break-all; }
  </style>
</head>
<body>
  <header>
    <h1>CDP Flash Liquidation Agent — Multi-Protocol Base</h1>
    <div class="badge" id="status">initializing</div>
  </header>
  <main>
    <section class="panel full">
      <h2>Agent State</h2>
      <div class="meta">
        <div><label>Network</label><span id="network">—</span></div>
        <div><label>Smart Account</label><span id="smart_account">—</span></div>
        <div><label>Scans</label><span id="scan_count">0</span></div>
        <div><label>Protocols</label><span id="protocols">—</span></div>
      </div>
    </section>
    <section class="panel">
      <h2>AI Decision</h2>
      <pre id="decision">Waiting for first scan…</pre>
    </section>
    <section class="panel">
      <h2>Last Execution</h2>
      <pre id="execution">None</pre>
    </section>
    <section class="panel full">
      <h2>Liquidation Targets</h2>
      <table>
        <thead>
          <tr>
            <th>Protocol</th><th>User</th><th>HF</th><th>Pair</th><th>Debt</th><th>Est. Profit</th>
          </tr>
        </thead>
        <tbody id="targets"></tbody>
      </table>
    </section>
    <section class="panel full">
      <h2>Activity Log</h2>
      <pre id="logs"></pre>
    </section>
  </main>
  <script>
    async function refresh() {
      const res = await fetch('/api/status');
      const data = await res.json();
      document.getElementById('status').textContent = data.status;
      document.getElementById('network').textContent = data.network || '—';
      document.getElementById('smart_account').textContent = data.smart_account || '—';
      document.getElementById('scan_count').textContent = data.scan_count || 0;
      document.getElementById('protocols').textContent = (data.enabled_protocols || []).join(', ') || '—';
      document.getElementById('decision').textContent = JSON.stringify(data.decision, null, 2);
      document.getElementById('execution').textContent = JSON.stringify(data.last_execution, null, 2);
      document.getElementById('logs').textContent = (data.logs || []).join('\\n');
      const tbody = document.getElementById('targets');
      tbody.innerHTML = '';
      (data.targets || []).forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.protocol_name || t.protocol_id}</td>
          <td>${t.user.slice(0,10)}…</td>
          <td class="hf-bad">${Number(t.health_factor).toFixed(4)}</td>
          <td>${t.collateral_symbol}/${t.debt_symbol}</td>
          <td>${Number(t.debt_to_cover_human).toFixed(4)}</td>
          <td class="profit">$${Number(t.estimated_profit_usd).toFixed(2)}${t.executable ? '' : ' ⓘ'}</td>`;
        tbody.appendChild(tr);
      });
    }
    setInterval(refresh, 2000);
    refresh();
  </script>
</body>
</html>"""
