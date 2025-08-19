import { defineConfig } from "orval";

export default defineConfig({
  cdp: {
    input: {
      target: "../openapi.yaml",
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
      workspace: "./src/openapi-client",
    },
    hooks: {
      afterAllFilesWrite: "pnpm format",
    },
  },
});
