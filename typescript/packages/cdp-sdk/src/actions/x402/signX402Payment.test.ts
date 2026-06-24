import { describe, expect, it, vi } from "vitest";

import type { PaymentPayload, PaymentRequired } from "@x402/core/types";

const mockPayload: PaymentPayload = {
  x402Version: 2,
  resource: { url: "https://example.com/report" },
  accepted: {
    scheme: "exact",
    network: "eip155:84532",
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    amount: "1000",
    payTo: "0x0000000000000000000000000000000000000001",
    maxTimeoutSeconds: 60,
    extra: {},
  },
  payload: { signature: "0xmock" },
};

const mockCreatePaymentPayload = vi.fn().mockResolvedValue(mockPayload);

vi.mock("@x402/core/client", () => ({
  x402Client: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    createPaymentPayload: mockCreatePaymentPayload,
  })),
}));

vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: vi.fn(),
}));

vi.mock("@x402/evm/upto/client", () => ({
  UptoEvmScheme: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@x402/svm/exact/client", () => ({
  registerExactSvmScheme: vi.fn(),
}));

vi.mock("../../x402/account-signers.js", () => ({
  fromCdpEvmAccount: vi.fn().mockReturnValue({ address: "0xmock", signTypedData: vi.fn() }),
  fromCdpSmartWallet: vi.fn().mockReturnValue({ address: "0xmock", signTypedData: vi.fn() }),
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue({ address: "SolMock" }),
}));

import {
  signEvmX402Payment,
  signEvmSmartAccountX402Payment,
  signSolanaX402Payment,
} from "./signX402Payment.js";

import {
  fromCdpEvmAccount,
  fromCdpSmartWallet,
  cdpSolanaAccountToSvmSigner,
} from "../../x402/account-signers.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

const paymentRequired: PaymentRequired = {
  x402Version: 2,
  resource: { url: "https://example.com/report" },
  accepts: [
    {
      scheme: "exact",
      network: "eip155:84532",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      amount: "1000",
      payTo: "0x0000000000000000000000000000000000000001",
      maxTimeoutSeconds: 60,
      extra: {},
    },
  ],
};

const mixedPaymentRequired: PaymentRequired = {
  x402Version: 2,
  resource: { url: "https://example.com/report" },
  accepts: [
    {
      scheme: "exact",
      network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      asset: "11111111111111111111111111111111",
      amount: "1000",
      payTo: "11111111111111111111111111111111",
      maxTimeoutSeconds: 60,
      extra: {},
    },
    {
      scheme: "exact",
      network: "eip155:84532",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      amount: "1000",
      payTo: "0x0000000000000000000000000000000000000001",
      maxTimeoutSeconds: 60,
      extra: {},
    },
  ],
};

describe("signEvmX402Payment", () => {
  it("creates an EVM signer from the account", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, { paymentRequired });
    expect(fromCdpEvmAccount).toHaveBeenCalledWith(account);
  });

  it("registers the exact EVM scheme", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, { paymentRequired });
    expect(registerExactEvmScheme).toHaveBeenCalled();
  });

  it("returns the payment payload from x402Client", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    const result = await signEvmX402Payment(account, { paymentRequired });
    expect(result).toBe(mockPayload);
    expect(mockCreatePaymentPayload).toHaveBeenCalledWith(paymentRequired);
  });

  it("constructs an x402Client instance", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    const { x402Client } = await import("@x402/core/client");
    await signEvmX402Payment(account, { paymentRequired, acceptedIndex: 0 });
    expect(x402Client).toHaveBeenCalled();
  });

  it("selects acceptedIndex from original paymentRequired.accepts before x402 filtering", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, {
      paymentRequired: mixedPaymentRequired,
      acceptedIndex: 1,
    });

    expect(mockCreatePaymentPayload).toHaveBeenLastCalledWith({
      ...mixedPaymentRequired,
      accepts: [mixedPaymentRequired.accepts[1]],
    });
  });
});

describe("signEvmSmartAccountX402Payment", () => {
  it("creates an EVM signer from the smart account using fromCdpSmartWallet", async () => {
    const account = { address: "0xsmart" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmSmartAccountX402Payment(account, { paymentRequired });
    expect(fromCdpSmartWallet).toHaveBeenCalledWith(account);
  });

  it("returns the payment payload from x402Client", async () => {
    const account = { address: "0xsmart" as `0x${string}`, signTypedData: vi.fn() };
    const result = await signEvmSmartAccountX402Payment(account, { paymentRequired });
    expect(result).toBe(mockPayload);
  });
});

describe("signSolanaX402Payment", () => {
  it("creates a Solana signer from the account", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    await signSolanaX402Payment(account, { paymentRequired });
    expect(cdpSolanaAccountToSvmSigner).toHaveBeenCalledWith(account);
  });

  it("registers the exact SVM scheme", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    await signSolanaX402Payment(account, { paymentRequired });
    expect(registerExactSvmScheme).toHaveBeenCalled();
  });

  it("returns the payment payload from x402Client", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    const result = await signSolanaX402Payment(account, { paymentRequired });
    expect(result).toBe(mockPayload);
  });
});
