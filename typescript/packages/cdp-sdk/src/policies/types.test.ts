import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { z } from "zod";

import { MAX_RULES_PER_POLICY } from "./types.js";

const rulesSchema = z.object({
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
});

const operationSchema = z.object({
  requestBody: z.object({
    content: z.object({
      "application/json": z.object({
        schema: z.object({
          properties: z.object({
            rules: rulesSchema,
          }),
        }),
      }),
    }),
  }),
});

const openApiSchema = z.object({
  paths: z.record(z.record(z.unknown())),
});

const policySchemas = [
  { name: "CreatePolicyBody", path: "/v2/policy-engine/policies", method: "post" },
  {
    name: "UpdatePolicyBody",
    path: "/v2/policy-engine/policies/{policyId}",
    method: "put",
  },
] satisfies ReadonlyArray<{ name: string; path: string; method: "post" | "put" }>;

describe("policy rule limit", () => {
  const openApi = openApiSchema.parse(
    parse(readFileSync(new URL("../../../../../openapi.yaml", import.meta.url), "utf8")),
  );

  it.each(policySchemas)("keeps $name rules bounds in sync", ({ name, path, method }) => {
    const operation = operationSchema.parse(openApi.paths[path][method]);
    const rules = operation.requestBody.content["application/json"].schema.properties.rules;

    expect(rules.maxItems, `${name} rules maxItems is missing from openapi.yaml`).toBeDefined();
    expect(rules.maxItems).toBe(MAX_RULES_PER_POLICY);
    expect(rules.minItems, `${name} rules minItems is missing from openapi.yaml`).toBeDefined();
    expect(rules.minItems).toBe(1);
  });
});
