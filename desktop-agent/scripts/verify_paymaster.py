#!/usr/bin/env python3
"""Verify CDP paymaster allowlist accepts FlashLiquidator.liquidate() calls."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from cdp.evm_call_types import EncodedCall
from web3 import Web3

from agent.cdp_wallet import CdpWalletManager
from agent.protocols.aave_v3_base import FLASH_LIQUIDATOR_ABI, USDC_BASE, WETH_BASE
from config.settings import load_settings


async def main() -> None:
    settings = load_settings("base")
    if not settings.flash_liquidator_address:
        raise SystemExit("Set FLASH_LIQUIDATOR_ADDRESS in .env first.")

    wallet = CdpWalletManager(settings)
    bundle = await wallet.initialize()

    contract_addr = Web3.to_checksum_address(settings.flash_liquidator_address)
    contract = bundle.w3.eth.contract(address=contract_addr, abi=FLASH_LIQUIDATOR_ABI)

    owner_raw = bundle.w3.eth.call({"to": contract_addr, "data": "0x8da5cb5b"})
    owner = Web3.to_checksum_address("0x" + owner_raw.hex()[-40:])
    print("FlashLiquidator:", contract_addr)
    print("Contract owner:", owner)
    print("Smart account:", bundle.smart_account.address)
    print("Owner is smart account:", owner.lower() == bundle.smart_account.address.lower())

    # Dummy params — simulation will revert, but paymaster allowlist should pass.
    params = (
        Web3.to_checksum_address(WETH_BASE),
        Web3.to_checksum_address(USDC_BASE),
        "0x0000000000000000000000000000000000000001",
        1_000_000,
        500,
        1_000_000,
    )
    data = contract.functions.liquidate(
        Web3.to_checksum_address(USDC_BASE),
        1_000_000,
        params,
    )._encode_transaction_data()

    try:
        user_op = await bundle.cdp.evm.prepare_user_operation(
            smart_account=bundle.smart_account,
            calls=[EncodedCall(to=contract_addr, data=data, value="0")],
            network=settings.network,
            paymaster_url=bundle.paymaster_url,
        )
        print("\n✓ Paymaster prepared liquidate() user operation")
        print("  userOpHash:", user_op.user_op_hash)
    except Exception as exc:
        err = str(exc).lower()
        if "allowlist" in err or "not allowed" in err or "policy" in err:
            print("\n✗ Paymaster rejected call — check allowlist in CDP Portal")
            print("  Add:", contract_addr)
            print("  Function: liquidate(address,uint256,(address,address,address,uint256,uint24,uint256))")
            raise SystemExit(1) from exc
        if "reverted" in err:
            print("\n✓ Paymaster allowlist OK (simulation reverted on dummy params — expected)")
            print("  Real liquidations will prepare successfully when targets are profitable.")
        else:
            print("\n? Unexpected error:", exc)
            raise SystemExit(1) from exc
    finally:
        await wallet.close()


if __name__ == "__main__":
    asyncio.run(main())
