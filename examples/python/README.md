# CDP SDK Examples

## Setup

Follow these steps to get started:

1. Get a CDP API key and wallet secret from the [CDP Portal](https://portal.cdp.coinbase.com/access/api)
1. Fill in your API key and wallet secret in `.env.example`, then run `mv .env.example .env`
1. Install dependencies: `uv sync`
1. Run `source .env` to load the environment variables. You will need to do this every time you open a new terminal

## Usage

To run an example, use `uv run python` followed by the path to the example file, for example:

```bash
uv run python evm/create_account.py
```
