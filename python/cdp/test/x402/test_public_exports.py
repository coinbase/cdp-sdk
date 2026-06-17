"""Public export surface tests for top-level package parity."""

from __future__ import annotations

from pathlib import Path

import cdp.x402 as cdp_x402
import cdp.x402.core as core

# Canonical exported surface for cdp_x402 and cdp_x402.core.
# Failing either assertion means a name was accidentally added or removed.
_EXPECTED_PACKAGE_ALL = {
    # Facilitator
    "create_cdp_facilitator_client",
    "create_cdp_facilitator_client_sync",
    # Bazaar client
    "create_cdp_bazaar_client",
    "CDPBazaarClient",
    "ListDiscoveryResourcesParams",
    "SearchDiscoveryResourcesParams",
    "MerchantResourcesParams",
    "X402DiscoveryResourcesResponse",
    "X402SearchResourcesResponse",
    "X402DiscoveryMerchantResponse",
    "X402DiscoveryResource",
    "X402ResourceQuality",
    # Payment client
    "CDPx402Client",
    "CDPx402ClientResult",
    "create_cdp_x402_client",
    "InsufficientFundsError",
    "create_balance_check_hook",
    # Configuration
    "CDPx402ClientConfig",
    "resolve_credentials",
    "WalletConfig",
    "resolve_wallet_config",
    # Wallet adapters
    "from_cdp_evm_account",
    "from_cdp_smart_wallet",
    "resolve_network_from_chain_id",
    # Account provisioning
    "CDPAccountProvisionResult",
    "provision_cdp_accounts",
    # Resource server
    "CDPResourceServer",
    "CDPResourceServerConfig",
    "CDPRouteConfig",
    "CDPPaymentScheme",
    "CDPSchemeRegistration",
    "create_cdp_resource_server",
    "get_cdp_default_schemes",
    "CDP_SERVER_DEFAULT_EVM_NETWORKS",
    "CDP_SERVER_DEFAULT_NETWORKS",
    "CDP_SERVER_DEFAULT_SVM_NETWORKS",
    # CDP supported networks
    "CDP_DEFAULT_NETWORKS",
    # CAIP-2 network identifiers
    "ARBITRUM_CAIP2",
    "BASE_MAINNET_CAIP2",
    "BASE_SEPOLIA_CAIP2",
    "POLYGON_CAIP2",
    "SOLANA_DEVNET_CAIP2",
    "SOLANA_MAINNET_CAIP2",
    "WORLD_CAIP2",
    "WORLD_SEPOLIA_CAIP2",
    # USDC addresses
    "CDP_USDC_ADDRESSES",
    "USDC_ADDRESS_ARBITRUM",
    "USDC_ADDRESS_BASE_MAINNET",
    "USDC_ADDRESS_BASE_SEPOLIA",
    "USDC_ADDRESS_POLYGON",
    "USDC_ADDRESS_SOLANA_DEVNET",
    "USDC_ADDRESS_SOLANA_MAINNET",
    "USDC_ADDRESS_WORLD",
    "USDC_ADDRESS_WORLD_SEPOLIA",
    # Extensions
    "CDP_EXTENSION_BAZAAR",
    "CDP_EXTENSION_GAS_SPONSORING_EIP2612",
    "CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL",
    "CDP_SUPPORTED_EXTENSIONS",
    "CDPExtensions",
    "build_bazaar_declaration",
    "get_cdp_extension_registrations",
    # Guardrails
    "apply_spend_controls",
    "SpendControls",
    "SpendControlError",
    "SpendControlErrorCode",
    "SpendControlErrorCodes",
    "SpendControlErrorDetails",
    "SpendTracker",
    "DEFAULT_MAX_LEDGER_ENTRIES",
    "RecordSpendInput",
    "TotalSpendQuery",
    "SpendStore",
    "SpendLedgerEntry",
    "Amount",
    "Duration",
    "Asset",
    "Address",
    "parse_amount",
    "parse_duration",
    "normalize_asset",
    "normalize_network",
    "normalize_payee",
    "ResolvedSpendControls",
    "DEFAULT_APPROACHING_LIMIT_THRESHOLDS",
    "SpendControlsRegistry",
    "get_spend_controls_registry",
    # Settlement-aware HTTP transports
    "cdp_x402_httpx_transport",
    "cdp_x402_http_adapter",
}


def test_package_all_is_exact() -> None:
    """cdp_x402.__all__ must match the canonical set exactly (no additions, no removals)."""
    assert set(cdp_x402.__all__) == _EXPECTED_PACKAGE_ALL


def test_core_all_is_exact() -> None:
    """cdp_x402.core.__all__ must match the canonical set exactly."""
    assert set(core.__all__) == _EXPECTED_PACKAGE_ALL


def test_core_exports_wallet_helpers_and_credential_resolver() -> None:
    assert callable(core.resolve_credentials)
    assert callable(core.resolve_wallet_config)
    assert callable(core.from_cdp_evm_account)
    assert callable(core.from_cdp_smart_wallet)
    assert callable(core.resolve_network_from_chain_id)


def test_package_root_exports_wallet_helpers_and_credential_resolver() -> None:
    assert callable(cdp_x402.resolve_credentials)
    assert callable(cdp_x402.resolve_wallet_config)
    assert callable(cdp_x402.from_cdp_evm_account)
    assert callable(cdp_x402.from_cdp_smart_wallet)
    assert callable(cdp_x402.resolve_network_from_chain_id)


def test_core_exports_resource_server_surface() -> None:
    assert isinstance(core.CDPResourceServer, type)
    assert callable(core.create_cdp_resource_server)
    assert callable(core.get_cdp_default_schemes)
    assert callable(core.get_cdp_extension_registrations)
    assert callable(core.build_bazaar_declaration)
    # Dataclasses
    assert isinstance(core.CDPRouteConfig, type)
    assert isinstance(core.CDPResourceServerConfig, type)
    assert isinstance(core.CDPSchemeRegistration, type)
    # Constants
    assert isinstance(core.CDP_SERVER_DEFAULT_NETWORKS, tuple)
    assert isinstance(core.CDP_SERVER_DEFAULT_EVM_NETWORKS, tuple)
    assert isinstance(core.CDP_SERVER_DEFAULT_SVM_NETWORKS, tuple)
    assert isinstance(core.CDP_SUPPORTED_EXTENSIONS, dict)


def test_package_root_exports_resource_server_surface() -> None:
    assert isinstance(cdp_x402.CDPResourceServer, type)
    assert callable(cdp_x402.create_cdp_resource_server)
    assert callable(cdp_x402.get_cdp_default_schemes)
    assert callable(cdp_x402.get_cdp_extension_registrations)
    assert callable(cdp_x402.build_bazaar_declaration)
    assert isinstance(cdp_x402.CDPRouteConfig, type)
    assert isinstance(cdp_x402.CDPResourceServerConfig, type)
    assert isinstance(cdp_x402.CDPSchemeRegistration, type)
    assert isinstance(cdp_x402.CDP_SERVER_DEFAULT_NETWORKS, tuple)
    assert isinstance(cdp_x402.CDP_SERVER_DEFAULT_EVM_NETWORKS, tuple)
    assert isinstance(cdp_x402.CDP_SERVER_DEFAULT_SVM_NETWORKS, tuple)
    assert isinstance(cdp_x402.CDP_SUPPORTED_EXTENSIONS, dict)


def test_server_extras_install_x402_extensions() -> None:
    """Server installs need x402[extensions] for upstream Bazaar enrichment."""
    pyproject_path = Path(__file__).resolve().parents[3] / "pyproject.toml"
    pyproject = pyproject_path.read_text()

    assert '"x402[mechanisms,extensions,fastapi]>=2.11.0"' in pyproject
    assert '"x402[mechanisms,extensions,flask]>=2.11.0"' in pyproject


def test_core_exports_guardrails_parity_symbols() -> None:
    assert core.DEFAULT_MAX_LEDGER_ENTRIES == 10_000
    assert callable(core.RecordSpendInput)
    assert callable(core.TotalSpendQuery)
    assert core.SpendControlErrorCode is not None
    assert core.SpendControlErrorDetails is not None


def test_package_root_exports_guardrails_parity_symbols() -> None:
    assert cdp_x402.DEFAULT_MAX_LEDGER_ENTRIES == 10_000
    assert callable(cdp_x402.RecordSpendInput)
    assert callable(cdp_x402.TotalSpendQuery)
    assert cdp_x402.SpendControlErrorCode is not None
    assert cdp_x402.SpendControlErrorDetails is not None
