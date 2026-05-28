import { describe, it, expect, vi } from "vitest";
import type { CdpClient } from "@coinbase/cdp-sdk";

import {
  findSmartAccountByOwner,
  isOwnerAlreadyHasSmartWalletError,
} from "../../../src/core/wallets/provision.js";

// ---------------------------------------------------------------------------
// isOwnerAlreadyHasSmartWalletError
// ---------------------------------------------------------------------------

describe("isOwnerAlreadyHasSmartWalletError", () => {
  it("returns true for the expected CDP SDK error message", () => {
    const err = new Error("Multiple smart wallets with the same owner are not allowed");
    expect(isOwnerAlreadyHasSmartWalletError(err)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isOwnerAlreadyHasSmartWalletError(new Error("some other error"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isOwnerAlreadyHasSmartWalletError("a string")).toBe(false);
    expect(isOwnerAlreadyHasSmartWalletError(null)).toBe(false);
    expect(isOwnerAlreadyHasSmartWalletError(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findSmartAccountByOwner
// ---------------------------------------------------------------------------

function makeAccount(address: string, ownerAddress: string) {
  return { address, owners: [ownerAddress] };
}

function makeCdpClient(
  pages: Array<{ accounts: ReturnType<typeof makeAccount>[]; nextPageToken?: string }>,
) {
  let call = 0;
  const listSmartAccounts = vi.fn().mockImplementation(() => {
    const page = pages[call++];
    return Promise.resolve({
      accounts: page.accounts,
      nextPageToken: page.nextPageToken,
    });
  });
  return { evm: { listSmartAccounts } } as unknown as CdpClient;
}

describe("findSmartAccountByOwner", () => {
  it("finds an account on the first page", async () => {
    const target = makeAccount("0xSCW", "0xOWNER");
    const client = makeCdpClient([{ accounts: [target] }]);

    const result = await findSmartAccountByOwner(client, "0xOWNER");

    expect(result).toBe("0xSCW");
    expect(client.evm.listSmartAccounts).toHaveBeenCalledTimes(1);
    expect(client.evm.listSmartAccounts).toHaveBeenCalledWith({ pageToken: undefined });
  });

  it("finds an account on a subsequent page", async () => {
    const other = makeAccount("0xOTHER", "0xOTHER_OWNER");
    const target = makeAccount("0xSCW", "0xOWNER");
    const client = makeCdpClient([
      { accounts: [other], nextPageToken: "tok1" },
      { accounts: [target] },
    ]);

    const result = await findSmartAccountByOwner(client, "0xOWNER");

    expect(result).toBe("0xSCW");
    expect(client.evm.listSmartAccounts).toHaveBeenCalledTimes(2);
    expect(client.evm.listSmartAccounts).toHaveBeenNthCalledWith(2, { pageToken: "tok1" });
  });

  it("returns undefined when account is not found across all pages", async () => {
    const other = makeAccount("0xOTHER", "0xOTHER_OWNER");
    const client = makeCdpClient([{ accounts: [other], nextPageToken: "tok1" }, { accounts: [] }]);

    const result = await findSmartAccountByOwner(client, "0xOWNER");

    expect(result).toBeUndefined();
  });

  it("performs case-insensitive owner address comparison", async () => {
    const target = makeAccount("0xSCW", "0xabcDEF");
    const client = makeCdpClient([{ accounts: [target] }]);

    const result = await findSmartAccountByOwner(client, "0xABCdef");

    expect(result).toBe("0xSCW");
  });

  it("stops fetching pages once a match is found", async () => {
    const target = makeAccount("0xSCW", "0xOWNER");
    const client = makeCdpClient([{ accounts: [target], nextPageToken: "tok1" }, { accounts: [] }]);

    await findSmartAccountByOwner(client, "0xOWNER");

    expect(client.evm.listSmartAccounts).toHaveBeenCalledTimes(1);
  });
});
