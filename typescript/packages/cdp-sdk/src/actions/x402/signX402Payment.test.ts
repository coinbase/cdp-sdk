import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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
  fromCdpSmartWallet: vi.fn().mockReturnValue({ address: "0xmock", signTypedData: vi.fn() }),
  cdpSolanaAccountToSvmSigner: vi.fn().mockReturnValue({ address: "SolMock" }),
}));

import {
  signEvmX402Payment,
  signEvmSmartAccountX402Payment,
  signSolanaX402Payment,
} from "./signX402Payment.js";

import { fromCdpSmartWallet, cdpSolanaAccountToSvmSigner } from "../../x402/account-signers.js";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

const evmPaymentRequired: PaymentRequired = {
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

const solanaPaymentRequired: PaymentRequired = {
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

const originalCdpX402RpcUrls = process.env.CDP_X402_RPC_URLS;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CDP_X402_RPC_URLS;
});

afterAll(() => {
  if (originalCdpX402RpcUrls === undefined) {
    delete process.env.CDP_X402_RPC_URLS;
  } else {
    process.env.CDP_X402_RPC_URLS = originalCdpX402RpcUrls;
  }
});

describe("signEvmX402Payment", () => {
  it("uses the EVM account directly as the signer", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, { paymentRequired: evmPaymentRequired, acceptedIndex: 0 });
    expect(registerExactEvmScheme).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signer: account }),
    );
    expect(UptoEvmScheme).toHaveBeenCalledWith(account, expect.any(Object));
  });

  it("registers the exact EVM scheme", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, { paymentRequired: evmPaymentRequired, acceptedIndex: 0 });
    expect(registerExactEvmScheme).toHaveBeenCalled();
  });

  it("returns the payment payload from x402Client", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    const result = await signEvmX402Payment(account, {
      paymentRequired: evmPaymentRequired,
      acceptedIndex: 0,
    });
    expect(result).toBe(mockPayload);
    expect(mockCreatePaymentPayload).toHaveBeenCalledWith(evmPaymentRequired);
  });

  it("constructs an x402Client instance", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    const { x402Client } = await import("@x402/core/client");
    await signEvmX402Payment(account, { paymentRequired: evmPaymentRequired, acceptedIndex: 0 });
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

  it("throws when acceptedIndex is out of range", async () => {
    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await expect(
      signEvmX402Payment(account, { paymentRequired: mixedPaymentRequired, acceptedIndex: 99 }),
    ).rejects.toThrow("acceptedIndex 99 is out of range");
  });

  it("applies CDP_X402_RPC_URLS overrides to exact and upto EVM schemes", async () => {
    process.env.CDP_X402_RPC_URLS = JSON.stringify({
      "eip155:84532": "https://custom.base-sepolia.example",
      "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": "https://ignored.solana.example",
    });

    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmX402Payment(account, { paymentRequired: evmPaymentRequired, acceptedIndex: 0 });

    const exactConfig = vi.mocked(registerExactEvmScheme).mock.calls.at(-1)?.[1] as
      | { schemeOptions?: Record<number, { rpcUrl: string }> }
      | undefined;

    expect(exactConfig?.schemeOptions?.[84532]?.rpcUrl).toBe("https://custom.base-sepolia.example");
    expect(exactConfig?.schemeOptions?.[8453]?.rpcUrl).toBe("https://mainnet.base.org");

    const uptoSchemeOptions = vi.mocked(UptoEvmScheme).mock.calls.at(-1)?.[1] as
      | Record<number, { rpcUrl: string }>
      | undefined;
    expect(uptoSchemeOptions?.[84532]?.rpcUrl).toBe("https://custom.base-sepolia.example");
    expect(uptoSchemeOptions?.[8453]?.rpcUrl).toBe("https://mainnet.base.org");
    expect(uptoSchemeOptions?.[480]).toBeDefined();
  });

  it("throws a clear error when CDP_X402_RPC_URLS is invalid JSON", async () => {
    process.env.CDP_X402_RPC_URLS = "{not-valid-json";

    const account = { address: "0xabc" as `0x${string}`, signTypedData: vi.fn() };
    await expect(
      signEvmX402Payment(account, { paymentRequired: evmPaymentRequired, acceptedIndex: 0 }),
    ).rejects.toThrow("Invalid CDP_X402_RPC_URLS");
  });
});

describe("signEvmSmartAccountX402Payment", () => {
  it("creates an EVM signer from the smart account using fromCdpSmartWallet", async () => {
    const account = { address: "0xsmart" as `0x${string}`, signTypedData: vi.fn() };
    await signEvmSmartAccountX402Payment(account, {
      paymentRequired: evmPaymentRequired,
      acceptedIndex: 0,
    });
    expect(fromCdpSmartWallet).toHaveBeenCalledWith(account);
  });

  it("returns the payment payload from x402Client", async () => {
    const account = { address: "0xsmart" as `0x${string}`, signTypedData: vi.fn() };
    const result = await signEvmSmartAccountX402Payment(account, {
      paymentRequired: evmPaymentRequired,
      acceptedIndex: 0,
    });
    expect(result).toBe(mockPayload);
  });
});

describe("signSolanaX402Payment", () => {
  it("creates a Solana signer from the account", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    await signSolanaX402Payment(account, {
      paymentRequired: solanaPaymentRequired,
      acceptedIndex: 0,
    });
    expect(cdpSolanaAccountToSvmSigner).toHaveBeenCalledWith(account);
  });

  it("registers the exact SVM scheme", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    await signSolanaX402Payment(account, {
      paymentRequired: solanaPaymentRequired,
      acceptedIndex: 0,
    });
    expect(registerExactSvmScheme).toHaveBeenCalled();
  });

  it("returns the payment payload from x402Client", async () => {
    const account = {
      address: "SolanaAddress",
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    };
    const result = await signSolanaX402Payment(account, {
      paymentRequired: solanaPaymentRequired,
      acceptedIndex: 0,
    });
    expect(result).toBe(mockPayload);
  });
});
