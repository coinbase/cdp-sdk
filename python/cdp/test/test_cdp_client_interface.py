import inspect
import re

import pytest

from cdp.evm_client import EvmClient
from cdp.openapi_client.api.evm_accounts_api import EVMAccountsApi
from cdp.openapi_client.api.evm_smart_accounts_api import EVMSmartAccountsApi
from cdp.openapi_client.api.evm_token_balances_api import EVMTokenBalancesApi
from cdp.openapi_client.api.faucets_api import FaucetsApi
from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.solana_client import SolanaClient


def get_public_methods(cls):
    """Extract public methods from a class that aren't special methods."""
    methods = []
    for name, _ in inspect.getmembers(cls, inspect.isfunction):
        # Skip private, special methods, and methods with _serialize, _with_http_info, or _without_preload_content suffixes
        if not name.startswith("_") and not re.search(
            r"_serialize$|_with_http_info$|_without_preload_content$", name
        ):
            methods.append(name)
    return methods


def is_method_wrapped(api_method, evm_methods, solana_methods):
    """Check if an API method is wrapped in either client."""
    if api_method in evm_methods or api_method in solana_methods:
        return True

    # For methods with 'evm' or 'solana', check for wrapped names without the evm or solana prefix
    stripped_method = api_method
    if "evm" in api_method:
        stripped_method = api_method.replace("evm_", "").replace("_by_name", "")
        if stripped_method in evm_methods:
            return True
    elif "solana" in api_method:
        stripped_method = api_method.replace("solana_", "").replace("_by_name", "")
        if stripped_method in solana_methods:
            return True
    elif "sol" in api_method:
        stripped_method = api_method.replace("sol_", "").replace("_by_name", "")
        if stripped_method in solana_methods:
            return True
    return False


@pytest.mark.asyncio
async def test_cdp_client_wraps_all_api_methods():
    """Test that client classes properly wrap all API methods."""
    evm_methods = get_public_methods(EvmClient)
    solana_methods = get_public_methods(SolanaClient)

    api_classes = [
        EVMAccountsApi,
        EVMSmartAccountsApi,
        EVMTokenBalancesApi,
        FaucetsApi,
        SolanaAccountsApi,
    ]

    for api_class in api_classes:
        api_methods = get_public_methods(api_class)

        for api_method in api_methods:
            wrapped = is_method_wrapped(api_method, evm_methods, solana_methods)

            print(f"Checking {api_method}: {'✓' if wrapped else '✗'}")

            assert wrapped, (
                f"API method '{api_method}' from {api_class.__name__} is not wrapped in either client. "
                f"Add a wrapper function to the appropriate client."
            )
