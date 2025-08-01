# QueryResultSchema

Schema information for the query result.

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**columns** | [**List[QueryResultSchemaColumnsInner]**](QueryResultSchemaColumnsInner.md) | Column definitions. | [optional] 

## Example

```python
from cdp.openapi_client.models.query_result_schema import QueryResultSchema

# TODO update the JSON string below
json = "{}"
# create an instance of QueryResultSchema from a JSON string
query_result_schema_instance = QueryResultSchema.from_json(json)
# print the JSON string representation of the object
print(QueryResultSchema.to_json())

# convert the object into a dict
query_result_schema_dict = query_result_schema_instance.to_dict()
# create an instance of QueryResultSchema from a dict
query_result_schema_from_dict = QueryResultSchema.from_dict(query_result_schema_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


