#!/usr/bin/env python3
import yaml
import sys


def update_xwalletauth_parameter(data):
    """
    Update the X-Wallet-Auth parameter to be optional.

    Args:
        data (dict): The parsed OpenAPI spec data
    """
    if "components" in data and "parameters" in data["components"]:
        if "XWalletAuth" in data["components"]["parameters"]:
            data["components"]["parameters"]["XWalletAuth"]["required"] = False
            print("Updated XWalletAuth parameter (required: True → False)")


def extract_inline_response_schemas(data):
    """
    Extract duplicate inline response schemas into named component schemas.

    When two operations share the same inline response schema (e.g., signEvmHash
    and signEvmHashWithEndUserAccount both return {signature: string}), the OpenAPI
    Generator deduplicates them and picks the name from whichever appears first in
    the spec. This leads to confusing type names like
    SignEvmHashWithEndUserAccount200Response being used for signEvmHash.

    This function finds such pairs, creates a named component schema using the base
    operation's name (e.g., SignEvmHash200Response), and replaces the inline schemas
    in both operations with a $ref to the new named schema.

    Args:
        data (dict): The parsed OpenAPI spec data
    """
    # Ensure components/schemas exists
    if "components" not in data:
        data["components"] = {}
    if "schemas" not in data["components"]:
        data["components"]["schemas"] = {}

    # Collect all operations with inline response schemas
    # Structure: {operationId: {path, method, status_code, schema, description}}
    inline_ops = {}

    for path, path_item in data.get("paths", {}).items():
        for method in ("get", "post", "put", "delete", "patch"):
            operation = path_item.get(method)
            if not isinstance(operation, dict):
                continue

            op_id = operation.get("operationId")
            if not op_id:
                continue

            for status_code in ("200", "201"):
                response = operation.get("responses", {}).get(status_code)
                if not response:
                    continue

                json_content = (
                    response.get("content", {}).get("application/json", {})
                )
                schema = json_content.get("schema")

                # Only process inline schemas (not $ref)
                if schema and "$ref" not in schema:
                    inline_ops[op_id] = {
                        "path": path,
                        "method": method,
                        "status_code": status_code,
                        "schema": schema,
                    }

    # Separate base operations from WithEndUserAccount operations
    suffix = "WithEndUserAccount"
    base_ops = {}
    enduser_ops = {}

    for op_id, info in inline_ops.items():
        if op_id.endswith(suffix):
            base_name = op_id[: -len(suffix)]
            enduser_ops[base_name] = (op_id, info)
        else:
            base_ops[op_id] = info

    # For each pair with identical schemas, extract to a named component schema
    extracted_count = 0
    for base_name, base_info in sorted(base_ops.items()):
        if base_name not in enduser_ops:
            continue

        enduser_op_id, enduser_info = enduser_ops[base_name]

        # Check if the response schemas are structurally identical
        if base_info["schema"] != enduser_info["schema"]:
            continue

        # Build the named schema key: capitalize first letter + status code + Response
        # e.g., signEvmHash -> SignEvmHash200Response
        schema_name = (
            base_name[0].upper()
            + base_name[1:]
            + base_info["status_code"]
            + "Response"
        )

        # Add the schema to components/schemas
        data["components"]["schemas"][schema_name] = base_info["schema"]

        ref = {"$ref": f"#/components/schemas/{schema_name}"}

        # Replace inline schema in the base operation
        base_op = data["paths"][base_info["path"]][base_info["method"]]
        base_op["responses"][base_info["status_code"]]["content"][
            "application/json"
        ]["schema"] = ref

        # Replace inline schema in the WithEndUserAccount operation
        enduser_op = data["paths"][enduser_info["path"]][enduser_info["method"]]
        enduser_op["responses"][enduser_info["status_code"]]["content"][
            "application/json"
        ]["schema"] = ref

        extracted_count += 1
        print(
            f"Extracted inline response schema: {schema_name} "
            f"(from {base_name} + {enduser_op_id})"
        )

    if extracted_count > 0:
        print(
            f"Extracted {extracted_count} inline response schema(s) "
            f"into named component schemas"
        )
    else:
        print("No duplicate inline response schemas found to extract")


def unify_request_body_schemas(data):
    """
    Unify divergent request body schemas between base and WithEndUserAccount operations.

    When a base operation (e.g., revokeSpendPermission) and its WithEndUserAccount
    counterpart use different named $ref request body schemas where one is a strict
    subset of the other, this function:

    1. Replaces the base operation's request body $ref with the superset schema
       (the WithEndUserAccount variant's schema)
    2. Relaxes the required fields in the superset schema to only include fields
       that exist in the subset schema

    This preserves backward compatibility by keeping the superset type name while
    not requiring callers to provide fields that are only relevant to the
    end-user account flow.

    Args:
        data (dict): The parsed OpenAPI spec data
    """
    schemas = data.get("components", {}).get("schemas", {})
    suffix = "WithEndUserAccount"

    # Collect all operations with named $ref request body schemas
    # Structure: {operationId: {path, method, schema_ref, schema_name}}
    ref_ops = {}

    for path, path_item in data.get("paths", {}).items():
        for method in ("get", "post", "put", "delete", "patch"):
            operation = path_item.get(method)
            if not isinstance(operation, dict):
                continue

            op_id = operation.get("operationId")
            if not op_id:
                continue

            request_body = operation.get("requestBody", {})
            json_content = (
                request_body.get("content", {}).get("application/json", {})
            )
            schema = json_content.get("schema", {})
            schema_ref = schema.get("$ref")

            if schema_ref and schema_ref.startswith("#/components/schemas/"):
                schema_name = schema_ref.split("/")[-1]
                ref_ops[op_id] = {
                    "path": path,
                    "method": method,
                    "schema_ref": schema_ref,
                    "schema_name": schema_name,
                }

    # Separate base operations from WithEndUserAccount operations
    base_ops = {}
    enduser_ops = {}

    for op_id, info in ref_ops.items():
        if op_id.endswith(suffix):
            base_name = op_id[: -len(suffix)]
            enduser_ops[base_name] = (op_id, info)
        else:
            base_ops[op_id] = info

    # Find pairs with different named $ref schemas where one is a subset
    unified_count = 0
    for base_name, base_info in sorted(base_ops.items()):
        if base_name not in enduser_ops:
            continue

        enduser_op_id, enduser_info = enduser_ops[base_name]

        # Skip if they already use the same schema
        if base_info["schema_name"] == enduser_info["schema_name"]:
            continue

        base_schema = schemas.get(base_info["schema_name"], {})
        enduser_schema = schemas.get(enduser_info["schema_name"], {})

        base_props = set(base_schema.get("properties", {}).keys())
        enduser_props = set(enduser_schema.get("properties", {}).keys())

        # Check if the base schema's properties are a strict subset of the
        # enduser schema's properties
        if not base_props or not base_props < enduser_props:
            continue

        # The enduser schema is the superset — use it for the base operation
        superset_name = enduser_info["schema_name"]
        superset_ref = enduser_info["schema_ref"]

        # Replace the base operation's request body $ref
        base_op = data["paths"][base_info["path"]][base_info["method"]]
        base_op["requestBody"]["content"]["application/json"]["schema"] = {
            "$ref": superset_ref
        }

        # Relax required fields: only require fields that exist in the subset
        superset_schema = schemas[superset_name]
        if "required" in superset_schema:
            base_required = set(base_schema.get("required", []))
            superset_schema["required"] = [
                field
                for field in superset_schema["required"]
                if field in base_required or field in base_props
            ]

        extra_fields = enduser_props - base_props
        unified_count += 1
        print(
            f"Unified request body schema: {base_name} now uses "
            f"{superset_name} (relaxed required: {extra_fields})"
        )

    if unified_count > 0:
        print(
            f"Unified {unified_count} request body schema(s) "
            f"for backward compatibility"
        )


def preprocess_openapi(input_file, output_file):
    """
    Preprocess an OpenAPI YAML file for SDK code generation.

    Applies the following transformations:
    1. Makes the X-Wallet-Auth parameter optional
    2. Extracts duplicate inline response schemas into named component schemas
    3. Unifies divergent request body schemas between base and WithEndUserAccount ops

    Args:
        input_file (str): Path to the input YAML file
        output_file (str): Path to save the modified YAML file
    """
    # Load the YAML file
    with open(input_file, "r") as file:
        data = yaml.safe_load(file)

    # Apply transformations
    update_xwalletauth_parameter(data)
    extract_inline_response_schemas(data)
    unify_request_body_schemas(data)

    # Save the modified YAML to the output file
    with open(output_file, "w") as file:
        yaml.dump(data, file, sort_keys=False)

    print(f"Preprocessed OpenAPI spec saved to {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage: python preprocess_openapi.py <input_yaml_file> <output_yaml_file>"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    preprocess_openapi(input_file, output_file)
