### Overview

The following methods can be used to authenticate your requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). Choose the method that best suits your needs:

| Method                                                                      | Difficulty   | Description                                                                                                                          |
| :-------------------------------------------------------------------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| [Use our modified HTTP client](#use-a-modified-urllib3-request-client)      | Easy         | Use a pre-configured [urllib3](https://pypi.org/project/urllib3/) client that automatically handles authentication for all requests. |
| [Generate your authorization headers](#generate-your-authorization-headers) | Intermediate | Generate authentication headers and apply them to your preferred HTTP client.                                                        |
| [Generate your JWT](#generate-a-jwt)                                        | Advanced     | Generate a JWT token, manually create your authentication headers, and apply them to your preferred HTTP client.                     |

Visit the [CDP Authentication docs](https://docs.cdp.coinbase.com/api-v2/docs/authentication) for more details.

### Generate a JWT

The following example shows how to generate a JWT token, which can then be injected manually into your `Authorization` header as a [Bearer Token](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/) to authenticate REST API requests to the [CDP APIs](https://docs.cdp.coinbase.com/api-v2/docs/welcome) using the HTTP request library of your choice.

**Step 1**: Install the required package:

```bash
pip install cdp-sdk
```

**Step 2**: Generate a JWT:

```python
from cdp.auth.utils.jwt import generate_jwt, JwtOptions

# For REST (HTTP) requests
jwt = generate_jwt(JwtOptions(
    api_key_id="YOUR_API_KEY_ID",
    api_key_secret="YOUR_API_KEY_SECRET",
    request_method="GET",
    request_host="api.cdp.coinbase.com",
    request_path="/platform/v2/evm/accounts",
    expires_in=120  # optional (defaults to 120 seconds)
))

print(jwt)

# For websocket connections
websocket_jwt = generate_jwt(JwtOptions(
    api_key_id="YOUR_API_KEY_ID",
    api_key_secret="YOUR_API_KEY_SECRET",
    request_method=None,
    request_host=None,
    request_path=None,
    expires_in=120  # optional (defaults to 120 seconds)
))

print(websocket_jwt)
```

For information about the above parameters, please refer to the [Authentication parameters](#authentication-parameters) section.

**Step 3**: Use your JWT (Bearer token) in the `Authorization` header of your HTTP request:

```bash
curl -L 'https://api.cdp.coinbase.com/platform/v2/evm/accounts' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer $jwt'
```

### Generate your authorization headers

The following example shows how to generate the required authentication headers for authenticating a request to the [CDP REST APIs](https://docs.cdp.coinbase.com/api-v2/docs/welcome). These headers can be added to your request manually using the HTTP request library of your choice.

**Step 1**: Install the required package:

```bash
pip install cdp-sdk
```

**Step 2**: Generate authorization headers:

```python
from cdp.auth.utils.http import get_auth_headers, GetAuthHeadersOptions

# Example POST request with a body
headers = get_auth_headers(
    GetAuthHeadersOptions(
        api_key_id="YOUR_API_KEY_ID",
        api_key_secret="YOUR_API_KEY_SECRET",
        wallet_secret="YOUR_WALLET_SECRET",
        request_method="POST",
        request_host="api.cdp.coinbase.com",
        request_path="/platform/v2/evm/accounts",
        request_body={
            "name": "MyAccount",
        },
        expires_in=120  # optional (defaults to 120 seconds)
    )
)

# Prints the headers required for authentication
print(headers)
```

For information about the above parameters, please refer to the [Authentication parameters](#authentication-parameters) section.

### Use a modified urllib3 request client

The following example shows how to use a modified `urllib3` request client to authenticate your requests to the [CDP REST APIs](https://docs.cdp.coinbase.com/api-v2/docs/welcome). This client will automatically add the appropriate authentication headers to each request.

**Step 1**: Install the required packages:

```bash
pip install urllib3 cdp-sdk
```

**Step 2**: Generate an HTTP request using the urllib3 request library:

```python
from cdp.auth.clients import Urllib3AuthClient, Urllib3AuthClientOptions

# Create an authenticated HTTP client
client = Urllib3AuthClient(
    Urllib3AuthClientOptions(
        api_key_id="YOUR_API_KEY_ID",
        api_key_secret="YOUR_API_KEY_SECRET",
        wallet_secret="YOUR_WALLET_SECRET"
    ),
    base_url="https://api.cdp.coinbase.com"
)

# Make authenticated requests (example)
# The appropriate authentication headers will be automatically added to the request
try:
    response = client.request(
        "POST",
        "/platform/v2/evm/accounts",
        body={
            "name": "MyAccount",
        }
    )
    print(response.data)
except Exception as error:
    print("Request failed:", error)
```

The `Urllib3AuthClient` will automatically:

- Generate a JWT for each request
- Add the JWT to the `Authorization` header
- Set the appropriate `Content-Type` header
- Add wallet authentication when required

For information about the above parameters, please refer to the [Authentication parameters](#authentication-parameters) section.

### Authentication parameters

The following table provides more context of many of the authentication parameters used in the examples above:

| Parameter        | Required | Description                                                                                                                                                                                                                                                                             |
| :--------------- | :------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api_key_id`     | true     | The unique identifier for your API key. Supported formats are:<br/>- `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`<br/>- `organizations/{orgId}/apiKeys/{keyId}`                                                                                                                               |
| `api_key_secret` | true     | Your API key secret. Supported formats are:<br/>- Edwards key (Ed25519): `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==`<br/>- Elliptic Curve key (ES256): `-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n` |
| `request_method` | true*   | The HTTP method for the API request you're authenticating (ie, `GET`, `POST`, `PUT`, `DELETE`). Can be `None` for JWTs intended for websocket connections.                                                                                                                               |
| `request_host`   | true*   | The API host you're calling (ie, `api.cdp.coinbase.com`). Can be `None` for JWTs intended for websocket connections.                                                                                                                                                                     |
| `request_path`   | true*   | The path of the specific API endpoint you're calling (ie, `/platform/v1/wallets`). Can be `None` for JWTs intended for websocket connections.                                                                                                                                            |
| `expires_in`     | false    | The JWT expiration time in seconds. After this time, the JWT will no longer be valid, and a new one must be generated. Defaults to `120` (ie, 2 minutes) if not specified.                                                                                                              |

\* Either all three request parameters (`request_method`, `request_host`, and `request_path`) must be provided for REST API requests, or all three must be `None` for JWTs intended for websocket connections.
