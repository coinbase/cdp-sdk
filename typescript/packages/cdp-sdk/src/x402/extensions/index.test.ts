import { describe, it, expect } from "vitest";
import {
  CDP_EXTENSION_GAS_SPONSORING_EIP2612,
  CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
  CDP_EXTENSION_BAZAAR,
  CDP_SUPPORTED_EXTENSIONS,
  getCdpExtensionRegistrations,
  buildBazaarDeclaration,
} from "./index.js";

describe("extension key constants", () => {
  it("CDP_EXTENSION_GAS_SPONSORING_EIP2612 matches @x402/evm EIP2612_GAS_SPONSORING_KEY", () => {
    expect(CDP_EXTENSION_GAS_SPONSORING_EIP2612).toBe("eip2612GasSponsoring");
  });

  it("CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL matches @x402/evm ERC20_APPROVAL_GAS_SPONSORING_KEY", () => {
    expect(CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL).toBe("erc20ApprovalGasSponsoring");
  });

  it("CDP_EXTENSION_BAZAAR matches the bazaar extension key", () => {
    expect(CDP_EXTENSION_BAZAAR).toBe("bazaar");
  });

  it("all three keys are distinct", () => {
    const keys = [
      CDP_EXTENSION_GAS_SPONSORING_EIP2612,
      CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL,
      CDP_EXTENSION_BAZAAR,
    ];
    expect(new Set(keys).size).toBe(3);
  });
});

describe("CDP_SUPPORTED_EXTENSIONS", () => {
  it("contains eip2612GasSponsoring", () => {
    expect(CDP_EXTENSION_GAS_SPONSORING_EIP2612 in CDP_SUPPORTED_EXTENSIONS).toBe(true);
  });

  it("contains erc20ApprovalGasSponsoring", () => {
    expect(CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL in CDP_SUPPORTED_EXTENSIONS).toBe(true);
  });

  it("does NOT contain bazaar (bazaar is injected per-route, not from this set)", () => {
    expect(CDP_EXTENSION_BAZAAR in CDP_SUPPORTED_EXTENSIONS).toBe(false);
  });

  it("each value is truthy (client checks for key presence)", () => {
    for (const value of Object.values(CDP_SUPPORTED_EXTENSIONS)) {
      expect(value).toBeTruthy();
    }
  });
});

describe("buildBazaarDeclaration()", () => {
  it("sets info.input.type to 'http'", () => {
    const decl = buildBazaarDeclaration("GET", "/report");
    expect((decl.info as { input: { type: string } }).input.type).toBe("http");
  });

  it("sets info.input.method from the provided method", () => {
    expect(
      (buildBazaarDeclaration("GET", "/a").info as { input: { method: string } }).input.method,
    ).toBe("GET");
    expect(
      (buildBazaarDeclaration("POST", "/a").info as { input: { method: string } }).input.method,
    ).toBe("POST");
    expect(
      (buildBazaarDeclaration("DELETE", "/a").info as { input: { method: string } }).input.method,
    ).toBe("DELETE");
  });

  it("sets routeTemplate to the provided path", () => {
    expect(buildBazaarDeclaration("GET", "/users/:id").routeTemplate).toBe("/users/:id");
    expect(buildBazaarDeclaration("POST", "/orders").routeTemplate).toBe("/orders");
  });

  it("does NOT include bodyType for GET, HEAD, DELETE (QueryInput methods)", () => {
    for (const method of ["GET", "HEAD", "DELETE"]) {
      const input = (
        buildBazaarDeclaration(method, "/x").info as { input: Record<string, unknown> }
      ).input;
      expect("bodyType" in input).toBe(false);
    }
  });

  it("includes bodyType 'json' for POST, PUT, PATCH (BodyInput methods)", () => {
    for (const method of ["POST", "PUT", "PATCH"]) {
      const input = (
        buildBazaarDeclaration(method, "/x").info as { input: Record<string, unknown> }
      ).input;
      expect(input.bodyType).toBe("json");
    }
  });

  it("includes a schema field required by the CDP Facilitator's ValidateDiscoveryExtension", () => {
    const decl = buildBazaarDeclaration("GET", "/report");
    expect(decl.schema).toBeDefined();
    expect(typeof decl.schema).toBe("object");
  });

  it("schema.properties.input contains type and method constraints", () => {
    const decl = buildBazaarDeclaration("GET", "/report");
    const inputSchema = (
      decl.schema as { properties: { input: { properties: Record<string, unknown> } } }
    ).properties.input;
    expect(inputSchema.properties.type).toBeDefined();
    expect(inputSchema.properties.method).toBeDefined();
  });

  it("schema.properties.input.required includes 'type' and 'method' for GET", () => {
    const decl = buildBazaarDeclaration("GET", "/report");
    const required = (decl.schema as { properties: { input: { required: string[] } } }).properties
      .input.required;
    expect(required).toContain("type");
    expect(required).toContain("method");
    expect(required).not.toContain("bodyType");
  });

  it("schema.properties.input.required includes 'bodyType' for POST", () => {
    const decl = buildBazaarDeclaration("POST", "/orders");
    const required = (decl.schema as { properties: { input: { required: string[] } } }).properties
      .input.required;
    expect(required).toContain("bodyType");
  });

  it("schema.properties.input.additionalProperties is false (matches Go SDK output)", () => {
    const decl = buildBazaarDeclaration("GET", "/report");
    const inputSchema = (decl.schema as { properties: { input: Record<string, unknown> } })
      .properties.input;
    expect(inputSchema.additionalProperties).toBe(false);
  });

  it("returns a new object on each call (no shared reference)", () => {
    expect(buildBazaarDeclaration("GET", "/a")).not.toBe(buildBazaarDeclaration("GET", "/a"));
  });
});

describe("getCdpExtensionRegistrations()", () => {
  it("returns exactly three registrations — one per CDP extension", () => {
    expect(getCdpExtensionRegistrations()).toHaveLength(3);
  });

  it("returns a new array on each call (no shared reference)", () => {
    expect(getCdpExtensionRegistrations()).not.toBe(getCdpExtensionRegistrations());
  });

  it("covers all three CDP extension keys", () => {
    const keys = getCdpExtensionRegistrations().map((r) => r.key);
    expect(keys).toContain(CDP_EXTENSION_GAS_SPONSORING_EIP2612);
    expect(keys).toContain(CDP_EXTENSION_GAS_SPONSORING_ERC20_APPROVAL);
    expect(keys).toContain(CDP_EXTENSION_BAZAAR);
  });

  it("all keys are distinct", () => {
    const keys = getCdpExtensionRegistrations().map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every registration has an enrichPaymentRequiredResponse hook", () => {
    for (const reg of getCdpExtensionRegistrations()) {
      expect(typeof reg.enrichPaymentRequiredResponse).toBe("function");
    }
  });

  describe("enrichPaymentRequiredResponse", () => {
    const DUMMY_CONTEXT = {
      requirements: [],
      resourceInfo: { url: "https://example.com" },
      paymentRequiredResponse: { x402Version: 2, resource: { url: "" }, accepts: [] },
    };

    it("returns the declaration unchanged when it is a truthy object", async () => {
      const declaration = { someField: "someValue" };
      for (const reg of getCdpExtensionRegistrations()) {
        const result = await reg.enrichPaymentRequiredResponse!(declaration, DUMMY_CONTEXT);
        expect(result).toBe(declaration);
      }
    });

    it("returns an empty object when declaration is null", async () => {
      for (const reg of getCdpExtensionRegistrations()) {
        expect(await reg.enrichPaymentRequiredResponse!(null, DUMMY_CONTEXT)).toEqual({});
      }
    });

    it("returns an empty object when declaration is undefined", async () => {
      for (const reg of getCdpExtensionRegistrations()) {
        expect(await reg.enrichPaymentRequiredResponse!(undefined, DUMMY_CONTEXT)).toEqual({});
      }
    });
  });
});
