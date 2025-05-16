import os

from cdp.__version__ import __version__
from cdp.analytics import Analytics, wrap_class_with_error_tracking
from cdp.api_clients import ApiClients
from cdp.constants import SDK_DEFAULT_SOURCE
from cdp.evm_client import EvmClient
from cdp.openapi_client.cdp_api_client import CdpApiClient
from cdp.policies_client import PoliciesClient
from cdp.solana_client import SolanaClient


class CdpClient:
    """The CdpClient class is responsible for configuring and managing the CDP API client."""

    def __init__(
        self,
        api_key_id: str | None = None,
        api_key_secret: str | None = None,
        wallet_secret: str | None = None,
        debugging: bool = False,
        base_path: str = "https://api.cdp.coinbase.com/platform",
        max_network_retries: int = 3,
        source: str = SDK_DEFAULT_SOURCE,
        source_version: str = __version__,
    ):
        """Instantiate the CdpClient.

        Args:
            api_key_id (str, optional): The API key ID. Defaults to the CDP_API_KEY_ID environment variable.
            api_key_secret (str, optional): The API key secret. Defaults to the CDP_API_KEY_SECRET environment variable.
            wallet_secret (str, optional): The wallet secret. Defaults to the CDP_WALLET_SECRET environment variable.
            debugging (bool, optional): Whether to enable debugging. Defaults to False.
            base_path (str, optional): The base path. Defaults to "https://api.cdp.coinbase.com/platform".
            max_network_retries (int, optional): The maximum number of network retries. Defaults to 3.
            source (str, optional): The source. Defaults to SDK_DEFAULT_SOURCE.
            source_version (str, optional): The source version. Defaults to __version__.

        """
        api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID") or os.getenv("CDP_API_KEY_NAME")
        api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")
        wallet_secret = wallet_secret or os.getenv("CDP_WALLET_SECRET")

        if not api_key_id or not api_key_secret:
            raise ValueError("""
\nMissing required CDP Secret API Key configuration parameters.

You can set them as environment variables:

CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret

You can also pass them as options to the constructor:

cdp = CdpClient(
  api_key_id="your-api-key-id",
  api_key_secret="your-api-key-secret",
)

If you're performing write operations, make sure to also set your wallet secret:

CDP_WALLET_SECRET=your-wallet-secret

This is also available as an option to the constructor:

cdp = CdpClient(
  api_key_id="your-api-key-id",
  api_key_secret="your-api-key-secret",
  wallet_secret="your-wallet-secret",
)

For more information, see: https://github.com/coinbase/cdp-sdk/blob/main/python/README.md#api-keys.
""")

        self.api_key_id = api_key_id
        self.api_key_secret = api_key_secret
        self.wallet_secret = wallet_secret
        self.debugging = debugging
        self.cdp_api_client = CdpApiClient(
            api_key_id,
            api_key_secret,
            wallet_secret,
            debugging,
            base_path,
            max_network_retries,
            source,
            source_version,
        )
        self.api_clients = ApiClients(self.cdp_api_client)

        self._evm = EvmClient(self.api_clients)
        self._solana = SolanaClient(self.api_clients)
        self._policies = PoliciesClient(self.api_clients)

        if os.getenv("DISABLE_CDP_ERROR_REPORTING") != "true":
            Analytics["identifier"] = api_key_id
            wrap_class_with_error_tracking(CdpClient)
            wrap_class_with_error_tracking(EvmClient)
            wrap_class_with_error_tracking(SolanaClient)
            wrap_class_with_error_tracking(PoliciesClient)

    @property
    def evm(self) -> EvmClient:
        """Get the EvmClient instance."""
        return self._evm

    @property
    def solana(self) -> SolanaClient:
        """Get the SolanaClient instance."""
        return self._solana

    @property
    def policies(self) -> PoliciesClient:
        """Get the PoliciesClient instance."""
        return self._policies

    async def __aenter__(self):
        """Enter the context manager."""
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        """Exit the context manager."""
        await self.close()

    async def close(self):
        """Close the CDP client."""
        await self.api_clients.close()
        return None
