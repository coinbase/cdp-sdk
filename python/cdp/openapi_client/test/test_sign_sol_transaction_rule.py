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

from cdp.openapi_client.models.sign_sol_transaction_rule import SignSolTransactionRule

class TestSignSolTransactionRule(unittest.TestCase):
    """SignSolTransactionRule unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> SignSolTransactionRule:
        """Test SignSolTransactionRule
            include_optional is a boolean, when False only required
            params are included, when True both required and
            optional params are included """
        # uncomment below to create an instance of `SignSolTransactionRule`
        """
        model = SignSolTransactionRule()
        if include_optional:
            return SignSolTransactionRule(
                action = 'accept',
                operation = 'signSolTransaction',
                criteria = [{"type":"solAddress","addresses":["HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT"],"operator":"in"}]
            )
        else:
            return SignSolTransactionRule(
                action = 'accept',
                operation = 'signSolTransaction',
                criteria = [{"type":"solAddress","addresses":["HpabPRRCFbBKSuJr5PdkVvQc85FyxyTWkFM2obBRSvHT"],"operator":"in"}],
        )
        """

    def testSignSolTransactionRule(self):
        """Test SignSolTransactionRule"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)

if __name__ == '__main__':
    unittest.main()
