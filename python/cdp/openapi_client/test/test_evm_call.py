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

from cdp.openapi_client.models.evm_call import EvmCall


class TestEvmCall(unittest.TestCase):
    """EvmCall unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> EvmCall:
        """Test EvmCall
        include_optional is a boolean, when False only required
        params are included, when True both required and
        optional params are included"""
        # uncomment below to create an instance of `EvmCall`
        """
        model = EvmCall()
        if include_optional:
            return EvmCall(
                to = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                value = '0',
                data = '0xa9059cbb000000000000000000000000fc807d1be4997e5c7b33e4d8d57e60c5b0f02b1a0000000000000000000000000000000000000000000000000000000000000064'
            )
        else:
            return EvmCall(
                to = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                value = '0',
                data = '0xa9059cbb000000000000000000000000fc807d1be4997e5c7b33e4d8d57e60c5b0f02b1a0000000000000000000000000000000000000000000000000000000000000064',
        )
        """

    def testEvmCall(self):
        """Test EvmCall"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)


if __name__ == "__main__":
    unittest.main()
