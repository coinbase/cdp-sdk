import { describe, it, expect } from "vitest";

import { CreatePolicyBodySchema, UpdatePolicyBodySchema, Rule } from "./types.js";

const rule: Rule = {
  action: "reject",
  operation: "signEvmTransaction",
  criteria: [
    {
      type: "ethValue",
      ethValue: "1000000000000000000",
      operator: ">",
    },
  ],
};

const rules = (count: number): Rule[] => Array.from({ length: count }, () => rule);

describe.each([
  ["CreatePolicyBodySchema", CreatePolicyBodySchema, { scope: "account" }],
  ["UpdatePolicyBodySchema", UpdatePolicyBodySchema, {}],
] as const)("%s rules limit", (_name, schema, base) => {
  it.each([99, 100])("should accept %i rules", count => {
    const result = schema.parse({ ...base, rules: rules(count) });
    expect(result.rules).toHaveLength(count);
  });

  it("should reject 101 rules", () => {
    const result = schema.safeParse({ ...base, rules: rules(101) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("100");
  });
});
