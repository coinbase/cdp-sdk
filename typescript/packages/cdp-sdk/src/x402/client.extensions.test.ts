/*
 * Extension-registry behavior of CdpX402Client against the real `x402Client`
 * base class. `client.test.ts` mocks `@x402/core/client`, so it cannot observe
 * how same-key registrations collapse.
 */

import { BuilderCodeClientExtension } from "@x402/extensions/builder-code";
import { describe, expect, it } from "vitest";

import { CdpX402Client } from "./client.js";

import type { ClientExtension } from "@x402/core/client";

/**
 * Collects the builder-code extensions currently registered on a client.
 *
 * @param client - Client to inspect.
 * @returns Every registered extension keyed `"builder-code"`.
 */
function builderCodeExtensions(client: CdpX402Client): ClientExtension[] {
  return client.getExtensions().filter(extension => extension.key === "builder-code");
}

describe("CdpX402Client extension registry", () => {
  it("registers a builder-code extension even when builderCode is omitted, for the SDK's own attribution", () => {
    expect(builderCodeExtensions(new CdpX402Client())).toHaveLength(1);
  });

  it("registers exactly one builder-code extension from builderCode", () => {
    const client = new CdpX402Client({ builderCode: "my_client" });

    expect(builderCodeExtensions(client)).toHaveLength(1);
  });

  it("lets a manually registered builder-code extension replace the configured one", () => {
    const client = new CdpX402Client({ builderCode: "my_client" });
    const custom = new BuilderCodeClientExtension("my_override");

    client.registerExtension(custom);

    // The registry is keyed by extension key, so the caller's later
    // registration replaces the one built in the constructor.
    expect(builderCodeExtensions(client)).toEqual([custom]);
  });
});
