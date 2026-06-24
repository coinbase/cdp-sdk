import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBalanceCheckHook, InsufficientFundsError } from "../balance-check.js";
import type { CdpClient } from "../../client/cdp.js";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const EVM_ADDRESS = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const SVM_ADDRESS = "So11111111111111111111111111111111111111112";
const BASE_NETWORK = "eip155:8453";
const BASE_SEPOLIA_NETWORK = "eip155:84532";
const SOLANA_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

function makeRequirements(overrides: Record<string, unknown> = {}) {
  return {
    scheme: "exact",
    network: BASE_NETWORK,
    asset: USDC_BASE,
    amount: "1000000",
    payTo: "0xrecipient",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeContext(req: unknown) {
  return { selectedRequirements: req } as Parameters<ReturnType<typeof createBalanceCheckHook>>[0];
}

function makeCdpClient(evmBalance = 0n, svmBalance = 0n): CdpClient {
  return {
    evm: {
      listTokenBalances: vi.fn().mockResolvedValue({
        balances: [
          {
            token: { contractAddress: USDC_BASE },
            amount: { amount: evmBalance },
          },
        ],
        nextPageToken: undefined,
      }),
    },
    solana: {
      listTokenBalances: vi.fn().mockResolvedValue({
        balances: [
          {
            token: { mintAddress: "SomeMint111" },
            amount: { amount: svmBalance },
          },
        ],
        nextPageToken: undefined,
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as CdpClient;
}

describe("InsufficientFundsError", () => {
  it("has the correct code and message", () => {
    const err = new InsufficientFundsError({
      required: 1000n,
      available: 500n,
      asset: USDC_BASE,
      network: BASE_NETWORK,
      address: EVM_ADDRESS,
    });
    expect(err.code).toBe("insufficient_funds");
    expect(err.name).toBe("InsufficientFundsError");
    expect(err.required).toBe(1000n);
    expect(err.available).toBe(500n);
    expect(err.message).toContain("500");
    expect(err.message).toContain("1000");
  });
});

describe("createBalanceCheckHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("EVM (CDP indexed balance — Base / Base Sepolia)", () => {
    it("passes through when balance is sufficient", async () => {
      const cdpClient = makeCdpClient(2_000_000n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ amount: "1000000", network: BASE_NETWORK }));
      await expect(hook(ctx)).resolves.toBeUndefined();
    });

    it("throws InsufficientFundsError when balance is below required", async () => {
      const cdpClient = makeCdpClient(500_000n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ amount: "1000000", network: BASE_NETWORK }));
      await expect(hook(ctx)).rejects.toThrow(InsufficientFundsError);
    });

    it("uses Base Sepolia network for eip155:84532", async () => {
      const cdpClient = makeCdpClient(0n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ amount: "1000", network: BASE_SEPOLIA_NETWORK }));
      await expect(hook(ctx)).rejects.toThrow(InsufficientFundsError);
      expect(
        (cdpClient.evm.listTokenBalances as ReturnType<typeof vi.fn>).mock.calls[0][0],
      ).toMatchObject({
        network: "base-sepolia",
      });
    });

    it("returns undefined when amount is 0", async () => {
      const cdpClient = makeCdpClient(0n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ amount: "0" }));
      await expect(hook(ctx)).resolves.toBeUndefined();
    });

    it("returns undefined when amount field is missing", async () => {
      const cdpClient = makeCdpClient(0n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ amount: undefined }));
      await expect(hook(ctx)).resolves.toBeUndefined();
    });
  });

  describe("EVM (on-chain RPC fallback — custom network)", () => {
    it("skips check for unknown network without custom RPC", async () => {
      const cdpClient = makeCdpClient(0n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(makeRequirements({ network: "eip155:999" }));
      await expect(hook(ctx)).resolves.toBeUndefined();
      expect(cdpClient.evm.listTokenBalances as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    });
  });

  describe("SVM (Solana balance check)", () => {
    const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    it("throws InsufficientFundsError when Solana balance is zero", async () => {
      const cdpClient = makeCdpClient(0n, 0n);
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(
        makeRequirements({ network: SOLANA_NETWORK, asset: USDC_SOLANA, amount: "1000" }),
      );
      await expect(hook(ctx)).rejects.toThrow(InsufficientFundsError);
    });

    it("passes when Solana balance is sufficient", async () => {
      const cdpClientCustom: CdpClient = {
        solana: {
          listTokenBalances: vi.fn().mockResolvedValue({
            balances: [
              {
                token: { mintAddress: USDC_SOLANA },
                amount: { amount: 5000n },
              },
            ],
            nextPageToken: undefined,
          }),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any as CdpClient;

      const hook = createBalanceCheckHook({
        cdpClient: cdpClientCustom,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
      });
      const ctx = makeContext(
        makeRequirements({ network: SOLANA_NETWORK, asset: USDC_SOLANA, amount: "1000" }),
      );
      await expect(hook(ctx)).resolves.toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("skips check and warns when balance API throws", async () => {
      const cdpClient: CdpClient = {
        evm: {
          listTokenBalances: vi.fn().mockRejectedValue(new Error("network error")),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any as CdpClient;
      const onWarning = vi.fn();
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
        onWarning,
      });
      const ctx = makeContext(makeRequirements());
      await expect(hook(ctx)).resolves.toBeUndefined();
      expect(onWarning).toHaveBeenCalledWith(
        expect.stringContaining("Pre-flight balance check failed"),
        expect.any(Error),
      );
    });

    it("supports custom onWarning callback", async () => {
      const cdpClient: CdpClient = {
        evm: {
          listTokenBalances: vi.fn().mockRejectedValue(new Error("oops")),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any as CdpClient;
      const warn = vi.fn();
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
        onWarning: warn,
      });
      const ctx = makeContext(makeRequirements());
      await hook(ctx);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("RPC URL override", () => {
    it("uses custom RPC URL from rpcUrls config for unknown EVM network", async () => {
      const cdpClient = makeCdpClient(0n);
      // Simulate a token not in CDP indexed networks: polygon (eip155:137)
      // Since it's not base/base-sepolia, and we provide a custom RPC URL,
      // it should attempt on-chain lookup instead. The ERC-20 lookup will fail
      // without a real RPC, but a thrown error → skip (best-effort).
      const onWarning = vi.fn();
      const hook = createBalanceCheckHook({
        cdpClient,
        evmAddress: EVM_ADDRESS,
        svmAddress: SVM_ADDRESS,
        rpcUrls: {
          "eip155:137": { rpcUrl: "https://polygon.fake.rpc" },
        },
        onWarning,
      });
      const ctx = makeContext(makeRequirements({ network: "eip155:137", asset: USDC_BASE }));
      // The on-chain call will fail since it's a fake RPC — should skip gracefully
      await expect(hook(ctx)).resolves.toBeUndefined();
      expect(onWarning).toHaveBeenCalledWith(
        expect.stringContaining("Pre-flight balance check failed"),
        expect.anything(),
      );
    });
  });
});
