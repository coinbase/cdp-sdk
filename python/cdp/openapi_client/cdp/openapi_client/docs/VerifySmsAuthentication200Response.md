# VerifySmsAuthentication200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**end_user** | [**EndUser**](EndUser.md) |  | 
**is_new_end_user** | **bool** | Whether the end user was newly created. | 
**message** | **str** | The message to display to the end user. | 
**access_token** | **str** | The access token for the end user. This token should be used in subsequent requests to the Embedded Wallet APIs by specifing &#39;Bearer&#39; as the prefix of the &#x60;Authorization&#x60; header. | 
**valid_until** | **datetime** | The date and time until which the access token is valid, in ISO 8601 format. | 

## Example

```python
from cdp.openapi_client.models.verify_sms_authentication200_response import VerifySmsAuthentication200Response

# TODO update the JSON string below
json = "{}"
# create an instance of VerifySmsAuthentication200Response from a JSON string
verify_sms_authentication200_response_instance = VerifySmsAuthentication200Response.from_json(json)
# print the JSON string representation of the object
print(VerifySmsAuthentication200Response.to_json())

# convert the object into a dict
verify_sms_authentication200_response_dict = verify_sms_authentication200_response_instance.to_dict()
# create an instance of VerifySmsAuthentication200Response from a dict
verify_sms_authentication200_response_from_dict = VerifySmsAuthentication200Response.from_dict(verify_sms_authentication200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


