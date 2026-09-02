import { defineConfig } from "orval";

export default defineConfig({
  cdp: {
    input: {
      target: "../openapi.yaml",
      // These tags are owned by the fern-generated `_vendor` client (see
      // fern/generators.yml); exclude them here so orval no longer emits them.
      filters: {
        tags: ["Accounts", "Payment Methods", "Transfers", "Deposit Destinations"],
        mode: "exclude",
      },
    },
    output: {
      clean: true,
      target: "./generated",
      mode: "tags-split",
      mock: false,
      override: {
        mutator: {
          path: "./cdpApiClient.ts",
          name: "cdpApiClient",
          extension: ".js",
        },
      },
      workspace: "./packages/cdp-sdk/src/openapi-client",
    },
    hooks: {
      afterAllFilesWrite: "pnpm format",
    },
  },
});
