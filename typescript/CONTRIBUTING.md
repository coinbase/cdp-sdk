# TypeScript Development Guide

This guide covers TypeScript-specific setup and development for the CDP SDK.

## Contents

- [Development Setup](#development-setup)
- [Updating the SDK to use a new version of the OpenAPI specification](#updating-the-sdk-to-use-a-new-version-of-the-openapi-specification)
- [Testing](#testing)
- [Example Scripts](#example-scripts)
- [Code Style](#code-style)
- [Changelog](#changelog)

## Development Setup

The CDP SDK uses Node.js v22.x or higher and pnpm 10.x or higher.

You can run the following commands in your terminal to check your local Node.js and npm versions:

```bash
node --version
pnpm --version
```

If the versions are not correct or you don't have Node.js or npm installed, download through [fnm](https://github.com/Schniz/fnm).

Once you have these installed, make sure you install the project dependencies by running `pnpm install`.

## Updating the SDK to use a new version of the OpenAPI specification

The OpenAPI specification and OpenAPI clients are automatically generated by the [Update OpenAPI GitHub Action](https://github.com/coinbase/cdp-sdk/actions/workflows/update_openapi.yml).

### Pull the code:

- Pull the `update_openapi` branch locally and check out the local branch
- Run `git reset --soft HEAD~1 && git commit -am "Updated OpenAPI client"` to recommit as a signed commit

### Wrap the OpenAPI client functionality:

Add new EVM functionality in `src/client/evm/evm.ts` and Solana functionality in `src/client/solana/solana.ts`.

To wrap an openapi client function, follow these conventions:

1. Name the function but remove `Evm` or `Solana` from the function name.
2. Take in the underlying request body parameters directly in the function. For example,

```ts
export const signEvmHash = (
  address: string,
  signEvmHashBody: SignEvmHashBody,
  options?: SecondParameter<typeof cdpApiClient>,
) => {
  return cdpApiClient<SignEvmHash200>(
    {
      url: `/v2/evm/accounts/${address}/sign`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: signEvmHashBody,
    },
    options,
  );
};
```

becomes

```ts
class EvmClient {
  async signHash(options: SignHashOptions): Promise<SignatureResult> {
    const signature = await CdpOpenApiClient.signEvmHash(
      options.address,
      {
        hash: options.hash,
      },
      options.idempotencyKey,
    );

    return {
      signature: signature.signature as Hex,
    };
  }
}
```

Add unit tests for EVM in `src/client/evm/evm.test.ts` and Solana in `src/client/solana/solana.test.ts`. Follow the conventions of other unit tests. Update the E2E tests in `e2e.test.ts` file.

## Testing

### Running Testing

Run `pnpm test` to run all tests in the SDK.

## Example Scripts

The CDP SDK includes several runnable examples. To run an example, ensure your `.env` file is set up correctly. Then run `pnpm tsx <path-to-example>`.

- `src/examples/createEthAccount.ts` is a simple example that creates an Ethereum account.
- `src/examples/sendEthTx.ts` is an example that sends a transaction to the Ethereum blockchain.
- `src/examples/createSolAccount.ts` is a simple example that creates a Solana account.
- `src/examples/sendSolTx.ts` is an example that sends a transaction to the Solana blockchain.

## Code Style

We use ESLint and Prettier for linting and formatting. Run:

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Changelog

We use [changesets](https://github.com/changesets/changesets) to manage the changelog.

Changesets should be in the past tense, and they should be as specific as possible. Some examples of good changesets:

- Added a getAccount method to the EVM client
- Fixed a bug preventing wallet balances to be formatted correctly

Changesets are stored in the `.changeset` directory. Each changeset is stored as a markdown file with a random name generated by `changesets`.

To add a changeset, use `changesets` to create it for you:

```bash
pnpm run changeset
```

This will kick off an interactive prompt to help you create the changeset. Use the arrow keys to navigate the different options, and press the `Space` key to select an option. You'll be prompted to specify the type of change you are making (major, minor or patch). If you're adding a new feature, you should select `minor`. If you're fixing a bug, you should select `patch`. In the unlikely scenario that you are making a backwards-incompatible change, select `major`. Once selected, you will be prompted to provide a summary of your changes. This should be a short, specific description in the past tense (see above for examples).

Once complete, a new changeset will be created in the `.changeset` directory, which should be committed along with the changes in your Pull Request.

For more info on adding changelog entries, [see here](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
