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

from cdp.openapi_client.models.payment_method_limits import PaymentMethodLimits

class TestPaymentMethodLimits(unittest.TestCase):
    """PaymentMethodLimits unit test stubs"""

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def make_instance(self, include_optional) -> PaymentMethodLimits:
        """Test PaymentMethodLimits
            include_optional is a boolean, when False only required
            params are included, when True both required and
            optional params are included """
        # uncomment below to create an instance of `PaymentMethodLimits`
        """
        model = PaymentMethodLimits()
        if include_optional:
            return PaymentMethodLimits(
                source_limit = cdp.openapi_client.models.payment_method_limits_source_limit.PaymentMethod_limits_sourceLimit(
                    amount = '100', 
                    currency = 'USD', ),
                target_limit = cdp.openapi_client.models.payment_method_limits_target_limit.PaymentMethod_limits_targetLimit(
                    amount = '100', 
                    currency = 'USD', )
            )
        else:
            return PaymentMethodLimits(
        )
        """

    def testPaymentMethodLimits(self):
        """Test PaymentMethodLimits"""
        # inst_req_only = self.make_instance(include_optional=False)
        # inst_req_and_optional = self.make_instance(include_optional=True)

if __name__ == '__main__':
    unittest.main()
