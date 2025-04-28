### Overview

The following methods can be used to authenticate your requests to the [Coinbase Developer Platform (CDP)](https://docs.cdp.coinbase.com/). Choose the method that best suits your needs:

| Method | Difficulty | Description |
| :-- | :-- | :-- |
| [Use an Axios request client](#use-an-axios-request-interceptor) | Easy | Use an [Axios](https://axios-http.com/docs/intro) client with a pre-configured interceptor that automatically handles authentication for all requests. |
| [Generate your authorization headers](#generate-your-authorization-headers) | Intermediate | Generate authentication headers and apply them to your preferred HTTP client. |
| [Generate a JWT](#generate-a-jwt) | Advanced | Generate a JWT token, manually create your authentication headers, and apply them to your preferred HTTP client. |

Visit the [CDP Authentication docs](https://docs.cdp.coinbase.com/api-v2/docs/authentication) for more details.

### Generate a JWT

The following example shows how to generate a JWT token, which can then be injected manually into your `Authorization` header to authenticate REST API requests to the [CDP APIs](https://docs.cdp.coinbase.com/api-v2/docs/welcome) using the HTTP request library of your choice.

**Step 1**: Install the required package:

```bash
npm install @coinbase/cdp-sdk
```

**Step 2**: Generate a JWT:

```typescript
import { generateJwt } from "@coinbase/cdp-sdk/auth";

// For REST (HTTP) requests
const jwt = await generateJwt({
  apiKeyId: "YOUR_API_KEY_ID",
  apiKeySecret: "YOUR_API_KEY_SECRET",
  requestMethod: "GET",
  requestHost: "api.cdp.coinbase.com",
  requestPath: "/platform/v2/evm/accounts",
  expiresIn: 120, // optional (defaults to 120 seconds)
});

console.log(jwt);

// For websocket connections
const websocketJwt = await generateJwt({
  apiKeyId: "YOUR_API_KEY_ID",
  apiKeySecret: "YOUR_API_KEY_SECRET",
  requestMethod: null,
  requestHost: null,
  requestPath: null,
  expiresIn: 120, // optional (defaults to 120 seconds)
});

console.log(websocketJwt);
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

The following example shows how to generate the required authentication headers for authenticating a request to the [CDP REST APIs](https://docs.cdp.coinbase.com/api-v2/docs/welcome), using the HTTP request library of your choice.

**Step 1**: Install the required package:

```bash
npm install @coinbase/cdp-sdk
```

**Step 2**: Generate authorization headers:

```typescript
import { getAuthHeaders } from "@coinbase/cdp-sdk/auth";

const headers = await getAuthHeaders({
  apiKeyId: "YOUR_API_KEY_ID",
  apiKeySecret: "YOUR_API_KEY_SECRET",
  walletSecret: "YOUR_WALLET_SECRET",
  requestMethod: "POST",
  requestHost: "api.cdp.coinbase.com",
  requestPath: "/platform/v2/evm/accounts",
  requestBody: {
    name: "MyAccount",
  },
  expiresIn: 120, // optional (defaults to 120 seconds)
});

console.log(headers);
```

For information about the above parameters, please refer to the [Authentication parameters](#authentication-parameters) section.

### Use an Axios request interceptor

**Step 1**: Install the required packages:

```bash
npm install @coinbase/cdp-sdk axios
```

**Step 2**: Create an authenticated Axios client:

The following example shows how to use an [Axios](https://axios-http.com/docs/intro) HTTP client with a pre-configured interceptor to authenticate your requests to the CDP REST APIs. This client will automatically add the appropriate authentication headers to each request.

```typescript
import axios from "axios";
import { axiosHooks } from "@coinbase/cdp-sdk/auth";

// Create an Axios instance
const axiosClient = axios.create({
  baseURL: "https://api.cdp.coinbase.com",
});

// Add authentication to the client
axiosHooks.withAuth(axiosClient, {
  apiKeyId: "YOUR_API_KEY_ID",
  apiKeySecret: "YOUR_API_KEY_SECRET",
  walletSecret: "YOUR_WALLET_SECRET",
});

// Make authenticated requests (example)
// The appropriate authentication headers will be automatically added to the request
try {
  const response = await axiosClient.post("/platform/v2/evm/accounts", {
    name: "MyAccount",
  });
  console.log(response.data);
} catch (error) {
  console.error("Request failed:", error);
}
```

The Axios interceptor will automatically:

- Generate a JWT for each request
- Add the JWT to the `Authorization` header
- Set the appropriate `Content-Type` header
- Add wallet authentication when required

For information about the above parameters, please refer to the [Authentication parameters](#authentication-parameters) section.

### Authentication parameters

The following table provides more context of many of the authentication parameters used in the examples above:

| Parameter | Required | Description |
| :-- | :-- | :-- |
| `apiKeyId` | true | The unique identifier for your API key. Supported formats are:<br/>- `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`<br/>- `organizations/{orgId}/apiKeys/{keyId}` |
| `apiKeySecret` | true | Your API key secret. Supported formats are:<br/>- Edwards key (Ed25519): `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==`<br/>- Elliptic Curve key (ES256): `-----BEGIN EC PRIVATE KEY-----\n...\n...\n...==\n-----END EC PRIVATE KEY-----\n` |
| `requestMethod` | true* | The HTTP method for the API request you're authenticating (ie, `GET`, `POST`, `PUT`, `DELETE`). Can be `null` for JWTs intended for websocket connections. |
| `requestHost` | true* | The API host you're calling (ie, `api.cdp.coinbase.com`). Can be `null` for JWTs intended for websocket connections. |
| `requestPath` | true* | The path of the specific API endpoint you're calling (ie, `/platform/v1/wallets`). Can be `null` for JWTs intended for websocket connections. |
| `requestBody` | false | Optional request body data. |
| `expiresIn` | false | The JWT expiration time in seconds. After this time, the JWT will no longer be valid, and a new one must be generated. Defaults to `120` (ie, 2 minutes) if not specified. |

\* Either all three request parameters (`requestMethod`, `requestHost`, and `requestPath`) must be provided for REST API requests, or all three must be `null` for JWTs intended for websocket connections.
