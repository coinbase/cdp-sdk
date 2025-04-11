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

from cdp.openapi_client.models.sign_evm_hash_request import SignEvmHashRequest


class TestSignEvmHashRequest(unittest.TestCase):
    """SignEvmHashRequest unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> SignEvmHashRequest:
        """Test SignEvmHashRequest
        include_optional is a boolean, when False only required
        params are included, when True both required and
        optional params are included"""
        # uncomment below to create an instance of `SignEvmHashRequest`
        """
        model = SignEvmHashRequest()
        if include_optional:
            return SignEvmHashRequest(
                hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            )
        else:
            return SignEvmHashRequest(
                hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        )
        """

    def testSignEvmHashRequest(self):
        """Test SignEvmHashRequest"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)


if __name__ == "__main__":
    unittest.main()
