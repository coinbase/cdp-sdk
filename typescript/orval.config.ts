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
      mock: {
        type: "msw",
        delay: 0,
        useExamples: false,
        indexMockFiles: true,
      },
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
      afterAllFilesWrite: 'prettier -c .prettierrc --write "**/*.{ts,js,cjs,json,md}"',
    },
  },
});
