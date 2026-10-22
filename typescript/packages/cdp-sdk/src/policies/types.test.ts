import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  CreatePolicyBodySchema,
  UpdatePolicyBodySchema,
  PausePolicyBodySchema,
  Rule,
} from "./types.js";

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

describe("PausePolicyBodySchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const scenarios: Record<string, { body: { resumeAt?: string }; success: boolean }> = {
    "accepts an indefinite pause": { body: {}, success: true },
    "accepts a future ISO timestamp": {
      body: { resumeAt: "2030-01-01T01:00:00Z" },
      success: true,
    },
    "accepts a future ISO timestamp with an offset": {
      body: { resumeAt: "2030-01-01T03:00:00+02:00" },
      success: true,
    },
    "rejects a past ISO timestamp": {
      body: { resumeAt: "2029-12-31T23:59:59Z" },
      success: false,
    },
    "rejects a non-ISO string": { body: { resumeAt: "tomorrow" }, success: false },
  };

  it.each(Object.entries(scenarios))("%s", (_name, { body, success }) => {
    const result = PausePolicyBodySchema.safeParse(body);
    expect(result.success).toBe(success);
    if (result.success) {
      expect(result.data).toStrictEqual(body);
    }
  });
});
