import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MAX_RULES_PER_POLICY } from "./types.js";

const policySchemas = [
  { name: "CreatePolicyBody", operationId: "createPolicy" },
  { name: "UpdatePolicyBody", operationId: "updatePolicy" },
];

describe("policy rule limit", () => {
  const openApi = readFileSync(new URL("../../../../../openapi.yaml", import.meta.url), "utf8");

  it.each(policySchemas)("keeps $name rules maxItems in sync", ({ operationId }) => {
    const operationStart = openApi.indexOf(`operationId: ${operationId}`);
    const operationEnd = openApi.indexOf("\n  /", operationStart);
    const operation = openApi.slice(operationStart, operationEnd);
    const rulesStart = operation.indexOf("\n                rules:");
    const rulesEnd = operation.indexOf("\n              required:", rulesStart);
    const rulesSchema = operation.slice(rulesStart, rulesEnd);
    const maxItems = rulesSchema.match(/\n\s+maxItems: (\d+)/)?.[1];

    expect(Number(maxItems)).toBe(MAX_RULES_PER_POLICY);
  });
});
