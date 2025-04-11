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

from cdp.openapi_client.models.evm_smart_account import EvmSmartAccount


class TestEvmSmartAccount(unittest.TestCase):
    """EvmSmartAccount unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> EvmSmartAccount:
        """Test EvmSmartAccount
        include_optional is a boolean, when False only required
        params are included, when True both required and
        optional params are included"""
        # uncomment below to create an instance of `EvmSmartAccount`
        """
        model = EvmSmartAccount()
        if include_optional:
            return EvmSmartAccount(
                address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                owners = ["0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a"],
                name = 'my-smart-account'
            )
        else:
            return EvmSmartAccount(
                address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                owners = ["0xfc807D1bE4997e5C7B33E4d8D57e60c5b0f02B1a"],
        )
        """

    def testEvmSmartAccount(self):
        """Test EvmSmartAccount"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)


if __name__ == "__main__":
    unittest.main()
