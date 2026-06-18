#!/usr/bin/env python3
import yaml
import sys


def update_xwalletauth_parameter(input_file, output_file):
    """
    Update the X-Wallet-Auth parameter to be optional in an OpenAPI YAML file.

    Args:
        input_file (str): Path to the input YAML file
        output_file (str): Path to save the modified YAML file
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

    update_xwalletauth_parameter(input_file, output_file)
