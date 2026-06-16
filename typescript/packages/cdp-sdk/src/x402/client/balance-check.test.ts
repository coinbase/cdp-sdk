import { describe, it, expect, vi } from "vitest";

import {
  createBalanceCheckHook,
  InsufficientFundsError,
} from "./balance-check.js";

const EVM_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;
const SVM_ADDRESS = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function buildCdpClient(opts?: {
  evmBalances?: { token: { contractAddress: string }; amount: { amount: bigint } }[];
  evmPages?: Array<{
    balances: { token: { contractAddress: string }; amount: { amount: bigint } }[];
    nextPageToken?: string;
  }>;
  svmBalances?: { token: { mintAddress: string }; amount: { amount: bigint } }[];
  evmListThrows?: unknown;
  svmListThrows?: unknown;
}) {
  let evmCall = 0;
  const evmList = vi.fn().mockImplementation(async () => {
    if (opts?.evmListThrows) throw opts.evmListThrows;
    if (opts?.evmPages) {
      const page = opts.evmPages[evmCall];
      evmCall += 1;
      return page ?? { balances: [], nextPageToken: undefined };
    }
    return { balances: opts?.evmBalances ?? [], nextPageToken: undefined };
  });
  const svmList = vi.fn().mockImplementation(async () => {
    if (opts?.svmListThrows) throw opts.svmListThrows;
    return { balances: opts?.svmBalances ?? [], nextPageToken: undefined };
  });
  return {
    evm: { listTokenBalances: evmList },
    solana: { listTokenBalances: svmList },
    __evmList: evmList,
    __svmList: svmList,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function ctx(req: { network: string; asset: string; amount?: string; maxAmountRequired?: string }) {
  return {
    paymentRequired: {} as never,
    selectedRequirements: {
      scheme: "exact",
      network: req.network,
      asset: req.asset,
      amount: req.amount,
      maxAmountRequired: req.maxAmountRequired,
      payTo: "0xpayee",
      maxTimeoutSeconds: 60,
      extra: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

describe("createBalanceCheckHook", () => {
  it("passes when EVM balance is sufficient", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [
        { token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 5_000_000n } },
      ],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("throws InsufficientFundsError when EVM balance is below required", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [{ token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 100n } }],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("populates InsufficientFundsError fields", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [{ token: { contractAddress: USDC_BASE }, amount: { amount: 42n } }],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    try {
      await hook(ctx({ network: "eip155:8453", asset: USDC_BASE, amount: "1000000" }));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientFundsError);
      const err = e as InsufficientFundsError;
      expect(err.code).toBe("insufficient_funds");
      expect(err.required).toBe(1_000_000n);
      expect(err.available).toBe(42n);
      expect(err.network).toBe("eip155:8453");
      expect(err.asset).toBe(USDC_BASE);
      expect(err.address).toBe(EVM_ADDRESS);
    }
  });

  it("treats EVM asset comparison as case-insensitive", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [
        {
          token: { contractAddress: USDC_BASE_SEPOLIA },
          amount: { amount: 5_000_000n },
        },
      ],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA.toLowerCase(),
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("skips check on unsupported networks", async () => {
    const cdpClient = buildCdpClient({});
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:137",
          asset: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(cdpClient.__evmList).not.toHaveBeenCalled();
    expect(cdpClient.__svmList).not.toHaveBeenCalled();
  });

  it("raises InsufficientFundsError when asset is absent from wallet balances", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [
        {
          token: { contractAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca" },
          amount: { amount: 999n },
        },
      ],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("raises InsufficientFundsError when wallet has no tokens at all (empty balances)", async () => {
    const cdpClient = buildCdpClient({ evmBalances: [] });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    const err = await hook(
      ctx({ network: "eip155:84532", asset: USDC_BASE_SEPOLIA, amount: "1000000" }),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(InsufficientFundsError);
    expect((err as InsufficientFundsError).available).toBe(0n);
    expect((err as InsufficientFundsError).required).toBe(1_000_000n);
    expect((err as InsufficientFundsError).address).toBe(EVM_ADDRESS);
  });

  it("returns on first matching entry without fetching further pages", async () => {
    const cdpClient = buildCdpClient({
      evmPages: [
        {
          balances: [
            { token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 1_000_000n } },
          ],
          nextPageToken: "tok",
        },
        {
          balances: [
            { token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 999_999n } },
          ],
          nextPageToken: undefined,
        },
      ],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(cdpClient.__evmList).toHaveBeenCalledTimes(1);
  });

  it("paginates when asset is not on the first page", async () => {
    const cdpClient = buildCdpClient({
      evmPages: [
        {
          balances: [
            {
              token: { contractAddress: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca" },
              amount: { amount: 999n },
            },
          ],
          nextPageToken: "tok",
        },
        {
          balances: [
            { token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 5_000_000n } },
          ],
          nextPageToken: undefined,
        },
      ],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(cdpClient.__evmList).toHaveBeenCalledTimes(2);
  });

  it("falls back to maxAmountRequired when amount is absent", async () => {
    const cdpClient = buildCdpClient({
      evmBalances: [{ token: { contractAddress: USDC_BASE_SEPOLIA }, amount: { amount: 100n } }],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          maxAmountRequired: "1000000",
        }),
      ),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("logs and proceeds when the EVM balance API throws", async () => {
    const warn = vi.fn();
    const cdpClient = buildCdpClient({ evmListThrows: new Error("api blew up") });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: warn,
    });
    await expect(
      hook(
        ctx({
          network: "eip155:84532",
          asset: USDC_BASE_SEPOLIA,
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it("checks SVM balances against the configured SVM address", async () => {
    const cdpClient = buildCdpClient({
      svmBalances: [{ token: { mintAddress: USDC_SOLANA_DEVNET }, amount: { amount: 50n } }],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
          asset: USDC_SOLANA_DEVNET,
          amount: "1000000",
        }),
      ),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(cdpClient.__svmList).toHaveBeenCalledWith(
      expect.objectContaining({ address: SVM_ADDRESS, network: "solana-devnet" }),
    );
  });

  it("passes SVM check when balance is sufficient", async () => {
    const cdpClient = buildCdpClient({
      svmBalances: [{ token: { mintAddress: USDC_SOLANA_DEVNET }, amount: { amount: 5_000_000n } }],
    });
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(
        ctx({
          network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
          asset: USDC_SOLANA_DEVNET,
          amount: "1000000",
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("skips when amount is zero or unparseable", async () => {
    const cdpClient = buildCdpClient({});
    const hook = createBalanceCheckHook({
      cdpClient,
      evmAddress: EVM_ADDRESS,
      svmAddress: SVM_ADDRESS,
      onWarning: () => {},
    });
    await expect(
      hook(ctx({ network: "eip155:84532", asset: USDC_BASE_SEPOLIA, amount: "0" })),
    ).resolves.toBeUndefined();
    await expect(
      hook(ctx({ network: "eip155:84532", asset: USDC_BASE_SEPOLIA, amount: "not-a-number" })),
    ).resolves.toBeUndefined();
    expect(cdpClient.__evmList).not.toHaveBeenCalled();
  });
});
