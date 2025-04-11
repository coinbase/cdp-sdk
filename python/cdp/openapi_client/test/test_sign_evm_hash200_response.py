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

from cdp.openapi_client.models.sign_evm_hash200_response import SignEvmHash200Response


class TestSignEvmHash200Response(unittest.TestCase):
    """SignEvmHash200Response unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> SignEvmHash200Response:
        """Test SignEvmHash200Response
        include_optional is a boolean, when False only required
        params are included, when True both required and
        optional params are included"""
        # uncomment below to create an instance of `SignEvmHash200Response`
        """
        model = SignEvmHash200Response()
        if include_optional:
            return SignEvmHash200Response(
                signature = '0x1b0c9cf8cd4554c6c6d9e7311e88f1be075d7f25b418a044f4bf2c0a42a93e212ad0a8b54de9e0b5f7e3812de3f2c6cc79aa8c3e1c02e7ad14b4a8f42012c2c01b'
            )
        else:
            return SignEvmHash200Response(
                signature = '0x1b0c9cf8cd4554c6c6d9e7311e88f1be075d7f25b418a044f4bf2c0a42a93e212ad0a8b54de9e0b5f7e3812de3f2c6cc79aa8c3e1c02e7ad14b4a8f42012c2c01b',
        )
        """

    def testSignEvmHash200Response(self):
        """Test SignEvmHash200Response"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)


if __name__ == "__main__":
    unittest.main()
