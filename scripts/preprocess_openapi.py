#!/usr/bin/env python3
import copy
import re
import sys

import yaml

# oapi-codegen v1.16.3 (the final github.com/deepmap/oapi-codegen release, used for
# the Go client) resolves enum constant name conflicts in an order-dependent way:
# once an enum is marked for type-name prefixing, its prefixed keys no longer match
# later enums, so adding an enum can silently un-prefix existing ones. For example,
# adding VaultStatus renamed WebhookEventResponseStatusFailed to Failed, and adding
# LendNetwork un-prefixed X402V2Network, which breaks exported Go constants.
#
# Enums listed here get explicit, already-prefixed `x-enum-varnames` for Go only, so
# they never take part in the conflict pass and existing constant names stay stable.
# Add a new enum here when regenerating the Go client renames existing constants.
GO_EXPLICIT_ENUM_VARNAMES = ["LendNetwork", "VaultStatus"]


def go_enum_varname(type_name, value):
    """Return the oapi-codegen constant name for a prefixed enum value."""
    parts = re.split(r"[^0-9A-Za-z]+", str(value))
    return type_name + "".join(part[:1].upper() + part[1:] for part in parts if part)


def add_go_explicit_enum_varnames(data):
    """Pin Go constant names for the enums in GO_EXPLICIT_ENUM_VARNAMES."""
    schemas = data.get("components", {}).get("schemas", {})
    for name in GO_EXPLICIT_ENUM_VARNAMES:
        schema = schemas.get(name)
        if not schema or "enum" not in schema or "x-enum-varnames" in schema:
            continue
        schema["x-enum-varnames"] = [
            go_enum_varname(name, value) for value in schema["enum"]
        ]
        print(f"Pinned Go enum constant names for {name}")


PRIMITIVE_TYPES = {"string", "integer", "number", "boolean"}


def inline_primitive_allof_aliases(data):
    """Inline schemas that are a lone allOf $ref to a primitive schema.

    The Python generator (openapi-generator 7.11.0) turns a schema like
    `VaultDepositAmount: {allOf: [$ref: PositiveDecimal], description: ...}` into an
    `object`-typed field and imports a `cdp.openapi_client.models.object` module that
    does not exist, which makes the package un-importable. Copying the referenced
    primitive into the alias, keeping the alias's own keywords, avoids that.
    """
    schemas = data.get("components", {}).get("schemas", {})
    for name, schema in schemas.items():
        all_of = schema.get("allOf")
        if not all_of or len(all_of) != 1 or set(all_of[0]) != {"$ref"}:
            continue
        target = schemas.get(all_of[0]["$ref"].split("/")[-1], {})
        if target.get("type") not in PRIMITIVE_TYPES or "allOf" in target:
            continue
        inlined = copy.deepcopy(target)
        inlined.update({key: value for key, value in schema.items() if key != "allOf"})
        schemas[name] = inlined
        print(f"Inlined primitive allOf alias {name}")


def update_xwalletauth_parameter(input_file, output_file, go=False):
    """
    Update the X-Wallet-Auth parameter to be optional in an OpenAPI YAML file.

    Args:
        input_file (str): Path to the input YAML file
        output_file (str): Path to save the modified YAML file
        go (bool): Whether to apply the Go-only enum constant name pinning instead of the
            Python-only primitive alias inlining
    """
    # Load the YAML file
    with open(input_file, "r") as file:
        data = yaml.safe_load(file)

    # Update in components/parameters
    if "components" in data and "parameters" in data["components"]:
        if "XWalletAuth" in data["components"]["parameters"]:
            data["components"]["parameters"]["XWalletAuth"]["required"] = False
            print("Updated XWalletAuth parameter (required: True → False)")

    # Remove the OpenAPI 3.1 top-level `webhooks` block.
    #
    # These describe inbound webhook payloads the CDP server POSTs to a
    # customer-hosted URL; they are not callable client operations. The Python
    # generator (openapi-generator 7.11.0) mishandles them: it emits webhook
    # "operations" with empty parameter type annotations (e.g.
    # `onchain_activity_detected_event: ,`) which is a SyntaxError that makes the
    # whole package un-importable, and it clobbers same-tag path operations
    # (e.g. `listDataTokenBalances` under the "Onchain Data" tag). Stripping the
    # block keeps generation limited to real client endpoints.
    if "webhooks" in data:
        del data["webhooks"]
        print("Removed top-level webhooks block (not client-callable operations)")

    if go:
        add_go_explicit_enum_varnames(data)
    else:
        inline_primitive_allof_aliases(data)

    # Save the modified YAML to the output file
    with open(output_file, "w") as file:
        yaml.dump(data, file, sort_keys=False)

    print(f"Preprocessed OpenAPI spec saved to {output_file}")


if __name__ == "__main__":
    args = [arg for arg in sys.argv[1:] if arg != "--go"]
    if len(args) != 2:
        print(
            "Usage: python preprocess_openapi.py <input_yaml_file> <output_yaml_file> [--go]"
        )
        sys.exit(1)

    update_xwalletauth_parameter(args[0], args[1], go="--go" in sys.argv[1:])
