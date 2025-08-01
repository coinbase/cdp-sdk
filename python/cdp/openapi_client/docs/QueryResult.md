# QueryResult

Result of executing a SQL query.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**result** | **List[Dict[str, object]]** | Query result as an array of JSON objects representing rows. | [optional] 
**var_schema** | [**QueryResultSchema**](QueryResultSchema.md) |  | [optional] 

## Example

```python
from cdp.openapi_client.models.query_result import QueryResult

# TODO update the JSON string below
json = "{}"
# create an instance of QueryResult from a JSON string
query_result_instance = QueryResult.from_json(json)
# print the JSON string representation of the object
print(QueryResult.to_json())

# convert the object into a dict
query_result_dict = query_result_instance.to_dict()
# create an instance of QueryResult from a dict
query_result_from_dict = QueryResult.from_dict(query_result_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


