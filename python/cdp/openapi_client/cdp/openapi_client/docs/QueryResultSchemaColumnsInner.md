# QueryResultSchemaColumnsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Column name. | [optional] 
**type** | **str** | Column data type (ClickHouse types). | [optional] 

## Example

```python
from cdp.openapi_client.models.query_result_schema_columns_inner import QueryResultSchemaColumnsInner

# TODO update the JSON string below
json = "{}"
# create an instance of QueryResultSchemaColumnsInner from a JSON string
query_result_schema_columns_inner_instance = QueryResultSchemaColumnsInner.from_json(json)
# print the JSON string representation of the object
print(QueryResultSchemaColumnsInner.to_json())

# convert the object into a dict
query_result_schema_columns_inner_dict = query_result_schema_columns_inner_instance.to_dict()
# create an instance of QueryResultSchemaColumnsInner from a dict
query_result_schema_columns_inner_from_dict = QueryResultSchemaColumnsInner.from_dict(query_result_schema_columns_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


