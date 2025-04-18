# coding: utf-8

"""
    Coinbase Developer Platform APIs

    The Coinbase Developer Platform APIs - leading the world's transition onchain.

    The version of the OpenAPI document: 2.0.0
    Contact: cdp@coinbase.com
    Generated by OpenAPI Generator (https://openapi-generator.tech)

    Do not edit the class manually.
"""  # noqa: E501


import unittest

from cdp.openapi_client.api.faucets_api import FaucetsApi


class TestFaucetsApi(unittest.IsolatedAsyncioTestCase):
    """FaucetsApi unit test stubs"""

    async def asyncSetUp(self) -> None:
        self.api = FaucetsApi()

    async def asyncTearDown(self) -> None:
        await self.api.api_client.close()

    async def test_request_evm_faucet(self) -> None:
        """Test case for request_evm_faucet

        Request funds on EVM test networks
        """
        pass

    async def test_request_solana_faucet(self) -> None:
        """Test case for request_solana_faucet

        Request funds on Solana devnet
        """
        pass


if __name__ == '__main__':
    unittest.main()
