import { describe, expect, it, vi } from "vitest";

import { toSolanaAccount } from "./toSolanaAccount.js";
import { signSolanaX402Payment } from "../../actions/x402/signX402Payment.js";

import type { Account } from "./types.js";
import type { CdpOpenApiClientType } from "../../openapi-client/index.js";
import type { PaymentRequired } from "@x402/core/types";

vi.mock("../../actions/x402/signX402Payment.js", () => ({
  signSolanaX402Payment: vi.fn().mockResolvedValue({ x402Version: 2, payload: {}, accepted: {} }),
}));

describe("toSolanaAccount", () => {
  it("should call signSolanaX402Payment when signX402Payment is called", async () => {
    const mockApiClient = {} as CdpOpenApiClientType;
    const openApiAccount = {
      address: "SolanaAddress",
      name: "Solana account",
      policies: undefined,
    } as Account;
    const account = toSolanaAccount(mockApiClient, { account: openApiAccount });
    const paymentRequired: PaymentRequired = {
      x402Version: 2,
      resource: { url: "https://example.com/report" },
      accepts: [],
    };

    await account.signX402Payment(paymentRequired, 3);

    expect(signSolanaX402Payment).toHaveBeenCalledWith(
      expect.objectContaining({ address: "SolanaAddress" }),
      { paymentRequired, acceptedIndex: 3 },
    );
  });
});
