# cdp.x402

The CDP SDK's x402 facilitator module for accessing Coinbase's hosted x402 facilitator service. This module is part of the CDP SDK and provides direct integration with Coinbase's facilitator for payment verification and settlement in the x402 Payment Protocol.

## Environment Variables

This module optionally uses CDP API keys from the [Coinbase Developer Platform](https://www.coinbase.com/developer-platform) for authenticated operations:

- `CDP_API_KEY_ID`: Your CDP API key ID
- `CDP_API_KEY_SECRET`: Your CDP API key secret

### Endpoint Authentication Requirements

| Endpoint | Authentication Required | Purpose |
|----------|------------------------|---------|
| `list` | ❌ No | Discover available bazaar items and payment options |
| `verify` | ✅ Yes | Verify payment transactions |
| `settle` | ✅ Yes | Settle completed payments |

**Note:** Environment variables are only required when using the `verify` and `settle` endpoints. The `list` endpoint can be used without authentication to discover bazaar items.

## Quick Start

### x402 V1 

```python
# Option 1: Import the default Coinbase facilitator config
# Works for list endpoint without credentials, or with CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables for verify/settle
from cdp.x402 import facilitator

# Option 2: Create a Coinbase facilitator config, passing in credentials directly
from cdp.x402 import create_facilitator_config

facilitator = create_facilitator_config("your-cdp-api-key-id", "your-cdp-api-key-secret")  # Pass in directly from preferred secret management

# Use the Coinbase facilitator config in your x402 integration
```

### x402 V2 (For HTTPFacilitatorClient)

```python
from cdp.x402 import create_facilitator_config_v2
from x402.http import HTTPFacilitatorClient
from x402.server import x402ResourceServer

# Create a V2 config for use with HTTPFacilitatorClient
facilitator_config = create_facilitator_config("your-cdp-api-key-id", "your-cdp-api-key-secret")

# Or use environment variables (CDP_API_KEY_ID and CDP_API_KEY_SECRET)
facilitator_config = create_facilitator_config()

# Use with HTTPFacilitatorClient
facilitator = HTTPFacilitatorClient(facilitator_config)
server = x402ResourceServer(facilitator)
```

## API Reference

### Functions

#### `create_facilitator_config(api_key_id=None, api_key_secret=None)`

Creates a facilitator configuration for accessing Coinbase's x402 facilitator service.

**Parameters:**
- `api_key_id` (str, optional): The CDP API key ID. If not provided, will use `CDP_API_KEY_ID` environment variable.
- `api_key_secret` (str, optional): The CDP API key secret. If not provided, will use `CDP_API_KEY_SECRET` environment variable.

**Returns:**
- `FacilitatorConfig`: A facilitator configuration object

#### `create_cdp_auth_headers(api_key_id, api_key_secret)`

Creates authenticated headers for Coinbase's x402 facilitator service.

**Parameters:**
- `api_key_id` (str): The CDP API key ID
- `api_key_secret` (str): The CDP API key secret

**Returns:**
- `Callable`: A function that returns the auth headers for verify, settle, and list operations

#### `create_cdp_unauth_headers()`

Creates unauthenticated headers for Coinbase's x402 facilitator service (list endpoint only).

**Returns:**
- `Callable`: A function that returns headers supporting only the list operation

### Types

#### `FacilitatorConfig`

Configuration object for accessing Coinbase's x402 facilitator service.

**Attributes:**
- `url` (str): The base URL for the facilitator service
- `create_headers` (Callable): Function to create authentication headers

## Constants

- `COINBASE_FACILITATOR_BASE_URL`: "https://api.cdp.coinbase.com"
- `COINBASE_FACILITATOR_V2_ROUTE`: "/platform/v2/x402"
- `X402_VERSION`: "2.0.0"

## Default Facilitator Instance

The CDP SDK's x402 module exports a default `facilitator` instance created with `create_facilitator_config()` that uses environment variables for configuration. This provides an easy way to access Coinbase's facilitator service without manual configuration.
