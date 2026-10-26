import { describe, expect, it } from "vitest";

import {
  EvmAddressCriterionSchema,
  EvmDataCriterionSchema,
  SignEvmTypedDataFieldCriterionSchema,
} from "./evmSchema.js";
import { CreatePolicyBodySchema, MAX_POLICY_RULES, UpdatePolicyBodySchema } from "./types.js";

describe("Zod 4 policy validation", () => {
  for (const [name, schema] of [
    ["create", CreatePolicyBodySchema],
    ["update", UpdatePolicyBodySchema],
  ] as const) {
    it(`${name}: rejects oversized rules before reading any rule`, () => {
      const rules = new Array(MAX_POLICY_RULES + 1);
      Object.defineProperty(rules, 0, {
        get() {
          throw new Error("Oversized rules must not be inspected");
        },
      });
      const result = schema.safeParse({ scope: "account", rules });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]).toMatchObject({
          code: "too_big",
          path: ["rules"],
          maximum: MAX_POLICY_RULES,
          message: `A policy can have at most ${MAX_POLICY_RULES} rules`,
        });
      }
    });

    it(`${name}: also rejects oversized rules before async validation`, async () => {
      const rules = new Array(MAX_POLICY_RULES + 1);
      Object.defineProperty(rules, 0, {
        get() {
          throw new Error("Oversized rules must not be inspected");
        },
      });
      const result = await schema.safeParseAsync({ scope: "account", rules });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]).toMatchObject({ code: "too_big", path: ["rules"] });
      }
    });
  }

  it("rejects oversized address lists before inspecting their elements", () => {
    const addresses = new Array(301);
    Object.defineProperty(addresses, 0, {
      get() {
        throw new Error("Oversized addresses must not be inspected");
      },
    });
    const result = EvmAddressCriterionSchema.safeParse({
      type: "evmAddress",
      operator: "in",
      addresses,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]).toMatchObject({ code: "too_big", path: ["addresses"] });
    }
  });

  it("keeps ABI and address schemas compatible with the policy schemas", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(
      EvmAddressCriterionSchema.parse({
        type: "evmAddress",
        operator: "in",
        addresses: [address],
      }).addresses,
    ).toEqual([address]);
    expect(
      EvmAddressCriterionSchema.safeParse({
        type: "evmAddress",
        operator: "in",
        addresses: ["not-an-address"],
      }).success,
    ).toBe(false);
    const criterion = {
      type: "evmData" as const,
      abi: [
        {
          type: "function" as const,
          name: "transfer",
          stateMutability: "nonpayable" as const,
          inputs: [{ name: "to", type: "address" }],
          outputs: [],
        },
      ],
      conditions: [{ function: "transfer" }],
    };
    expect(EvmDataCriterionSchema.parse(criterion)).toEqual(criterion);
    expect(
      EvmDataCriterionSchema.safeParse({ ...criterion, abi: [{ type: "invalid" }] }).success,
    ).toBe(false);
  });

  it("retains arbitrary EIP-712 type names with validated field definitions", () => {
    const schema = SignEvmTypedDataFieldCriterionSchema.shape.types;
    const definitions = {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Mail: [{ name: "contents", type: "string" }],
      },
      primaryType: "Mail",
    };
    expect(schema.parse(definitions)).toEqual(definitions);
    expect(
      schema.safeParse({ ...definitions, types: { Mail: [{ name: 123, type: "string" }] } })
        .success,
    ).toBe(false);
  });
});
