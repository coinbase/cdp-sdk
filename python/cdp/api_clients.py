from cdp.openapi_client.api.evm_accounts_api import EVMAccountsApi
from cdp.openapi_client.api.evm_smart_accounts_api import EVMSmartAccountsApi
from cdp.openapi_client.api.evm_swaps_api import EVMSwapsApi
from cdp.openapi_client.api.evm_token_balances_api import EVMTokenBalancesApi
from cdp.openapi_client.api.faucets_api import FaucetsApi
from cdp.openapi_client.api.payments_alpha_api import PaymentsAlphaApi
from cdp.openapi_client.api.policy_engine_api import PolicyEngineApi
from cdp.openapi_client.api.solana_accounts_api import SolanaAccountsApi
from cdp.openapi_client.cdp_api_client import CdpApiClient


class ApiClients:
    """A container class for all API clients used in the CDP SDK.

    This class provides lazy-loaded access to various API clients, ensuring
    that each client is only instantiated when it's first accessed.

    Attributes:
        _cdp_client (CdpApiClient): The CDP API client used to initialize individual API clients.
        _evm_accounts (Optional[EVMAccountsApi]): The EVMAccountsApi client instance.
        _evm_smart_accounts (Optional[EVMSmartAccountsApi]): The EVMSmartAccountsApi client instance.
        _evm_swaps (Optional[EVMSwapsApi]): The EVMSwapsApi client instance.
        _evm_token_balances (Optional[EVMTokenBalancesApi]): The EVMTokenBalancesApi client instance.
        _faucets (Optional[FaucetsApi]): The FaucetsApi client instance.
        _solana_accounts (Optional[SolanaAccountsApi]): The SolanaAccountsApi client instance.

    """

    def __init__(self, cdp_client: CdpApiClient) -> None:
        """Initialize the ApiClients instance.

        Args:
            cdp_client (CdpApiClient): The CDP API client to use for initializing individual API clients.

        """
        self._cdp_client: CdpApiClient = cdp_client

        self._evm_accounts: EVMAccountsApi | None = None
        self._evm_smart_accounts: EVMSmartAccountsApi | None = None
        self._evm_swaps: EVMSwapsApi | None = None
        self._evm_token_balances: EVMTokenBalancesApi | None = None
        self._faucets: FaucetsApi | None = None
        self._solana_accounts: SolanaAccountsApi | None = None
        self._policies: PolicyEngineApi | None = None
        self._payments: PaymentsAlphaApi | None = None

    @property
    def evm_accounts(self) -> EVMAccountsApi:
        """Get the EVMAccountsApi client instance.

        Returns:
            EVMAccountsApi: The EVMAccountsApi client instance.

        Note:
            This property lazily initializes the EVMAccountsApi client on first access.

        """
        if self._evm_accounts is None:
            self._evm_accounts = EVMAccountsApi(api_client=self._cdp_client)
        return self._evm_accounts

    @property
    def evm_smart_accounts(self) -> EVMSmartAccountsApi:
        """Get the EVMSmartAccountsApi client instance.

        Returns:
            EVMSmartAccountsApi: The EVMSmartAccountsApi client instance.

        Note:
            This property lazily initializes the EVMSmartAccountsApi client on first access.

        """
        if self._evm_smart_accounts is None:
            self._evm_smart_accounts = EVMSmartAccountsApi(api_client=self._cdp_client)
        return self._evm_smart_accounts

    @property
    def evm_swaps(self) -> EVMSwapsApi:
        """Get the EVMSwapsApi client instance.

        Returns:
            EVMSwapsApi: The EVMSwapsApi client instance.

        Note:
            This property lazily initializes the EVMSwapsApi client on first access.

        """
        if self._evm_swaps is None:
            self._evm_swaps = EVMSwapsApi(api_client=self._cdp_client)
        return self._evm_swaps

    @property
    def evm_token_balances(self) -> EVMTokenBalancesApi:
        """Get the EVMTokenBalancesApi client instance.

        Returns:
            EVMTokenBalancesApi: The EVMTokenBalancesApi client instance.

        Note:
            This property lazily initializes the EVMTokenBalancesApi client on first access.

        """
        if self._evm_token_balances is None:
            self._evm_token_balances = EVMTokenBalancesApi(api_client=self._cdp_client)
        return self._evm_token_balances

    @property
    def faucets(self) -> FaucetsApi:
        """Get the FaucetsApi client instance.

        Returns:
            FaucetsApi: The FaucetsApi client instance.

        Note:
            This property lazily initializes the FaucetsApi client on first access.

        """
        if self._faucets is None:
            self._faucets = FaucetsApi(api_client=self._cdp_client)
        return self._faucets

    @property
    def solana_accounts(self) -> SolanaAccountsApi:
        """Get the SolanaAccountsApi client instance.

        Returns:
            SolanaAccountsApi: The SolanaAccountsApi client instance.

        Note:
            This property lazily initializes the SolanaAccountsApi client on first access.

        """
        if self._solana_accounts is None:
            self._solana_accounts = SolanaAccountsApi(api_client=self._cdp_client)
        return self._solana_accounts

    @property
    def policies(self) -> PolicyEngineApi:
        """Get the PolicyEngineApi client instance.

        Returns:
            PolicyEngineApi: The PolicyEngineApi client instance.

        Note:
            This property lazily initializes the PolicyEngineApi client on first access.

        """
        if self._policies is None:
            self._policies = PolicyEngineApi(api_client=self._cdp_client)
        return self._policies

    @property
    def payments(self) -> PaymentsAlphaApi:
        """Get the PaymentsAlphaApi client instance.

        Returns:
            PaymentsAlphaApi: The PaymentsAlphaApi client instance.

        Note:
            This property lazily initializes the PaymentsAlphaApi client on first access.

        """
        if self._payments is None:
            self._payments = PaymentsAlphaApi(api_client=self._cdp_client)
        return self._payments

    async def close(self):
        """Close the CDP client asynchronously."""
        await self._cdp_client.close()
