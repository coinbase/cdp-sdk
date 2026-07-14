/*
 * Account-level x402 payment signing.
 *
 * `@x402/*` packages are optional peer dependencies of the SDK — most
 * consumers of `@coinbase/cdp-sdk` never touch x402, so every module reached
 * from an account's `signX402Payment()` method (this file, and the
 * `../../x402/account-signers.js` adapters it uses) loads them lazily via
 * dynamic `import()` instead of a static top-level import. That keeps a bare
 * `import { CdpClient } from "@coinbase/cdp-sdk"` from requiring `@x402/*` to
 * be installed at all; they're only resolved the first time a caller
 * actually signs an x402 payment.
 */
import { getDefaultEvmRpcUrls } from "../../x402/constants.js";

import type { CdpSmartAccount, CdpSolanaAccount } from "../../x402/account-signers.js";
import type { Network, PaymentPayload, PaymentRequired } from "@x402/core/types";
import type { ClientEvmSigner } from "@x402/evm";

/**
 * Dynamically imports an optional `@x402/*` peer dependency (or an internal
 * module that itself imports one), wrapping module-not-found failures with
 * an actionable install hint instead of a raw resolution error.
 *
 * @param specifier - The module specifier to import.
 * @param loader - Thunk performing the dynamic `import()`, so callers keep accurate typing.
 * @returns The imported module's exports.
 */
async function importX402Dependency<T>(specifier: string, loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    throw new Error(
      `Failed to load "${specifier}", which is required to sign x402 payments. ` +
        "Install the CDP SDK's x402 peer dependencies: `@x402/core`, `@x402/evm`, `@x402/svm`.",
      { cause: error },
    );
  }
}

/**
 * Options for signing an x402 payment payload.
 */
export interface SignX402PaymentOptions {
  /** The x402 payment requirements returned by a resource server. */
  paymentRequired: PaymentRequired;
  /**
   * Index into `paymentRequired.accepts` selecting which requirement to sign.
   */
  acceptedIndex: number;
}

type RpcUrlsByCaip2 = Record<string, { rpcUrl: string }>;

/**
 * Describes which networks and schemes a given CDP account type can sign for.
 * Used to produce actionable errors when an `acceptedIndex` selects a payment
 * requirement the account cannot fulfill.
 */
interface SigningCapability {
  /** CAIP-2 namespace this account type can sign for (e.g. `"eip155"`). */
  networkNamespace: string;
  /** x402 schemes this account type can produce payloads for. */
  supportedSchemes: readonly string[];
  /** Human-readable account type label used in error messages. */
  label: string;
}

const EVM_SIGNING_CAPABILITY: SigningCapability = {
  networkNamespace: "eip155",
  supportedSchemes: ["exact", "upto"],
  label: "EVM",
};

/*
 * Smart accounts sign with an ERC-1271/ERC-6492 contract signature, which only
 * settles via the EIP-3009 `exact` flow. The `upto` scheme and the Permit2
 * transfer method both require an on-chain Permit2 allowance owned by an EOA,
 * so they are intentionally unsupported for smart accounts.
 */
const EVM_SMART_ACCOUNT_SIGNING_CAPABILITY: SigningCapability = {
  networkNamespace: "eip155",
  supportedSchemes: ["exact"],
  label: "EVM smart",
};

const SVM_SIGNING_CAPABILITY: SigningCapability = {
  networkNamespace: "solana",
  supportedSchemes: ["exact"],
  label: "Solana",
};

/**
 * Parses JSON from CDP_X402_RPC_URLS and converts it into CAIP-2 keyed RPC config.
 *
 * Supports this value format:
 * - { "eip155:8453": "https://..." }
 *
 * @returns Parsed CAIP-2 keyed EVM/Solana RPC URL overrides.
 */
function parseRpcUrlsFromEnv(): RpcUrlsByCaip2 {
  const raw = process.env.CDP_X402_RPC_URLS;
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid CDP_X402_RPC_URLS: expected JSON object mapping CAIP-2 network IDs to RPC URL strings.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "Invalid CDP_X402_RPC_URLS: expected JSON object mapping CAIP-2 network IDs to RPC URL strings.",
    );
  }

  const rpcUrlsByCaip2: RpcUrlsByCaip2 = {};
  for (const [network, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      rpcUrlsByCaip2[network] = { rpcUrl: value };
      continue;
    }

    throw new Error(`Invalid CDP_X402_RPC_URLS entry for "${network}": expected string URL.`);
  }

  return rpcUrlsByCaip2;
}

/**
 * Resolves the final CAIP-2 keyed EVM RPC configuration used for x402 signing.
 *
 * Defaults come from {@link getDefaultEvmRpcUrls} (Base networks only), with
 * CDP_X402_RPC_URLS env values taking precedence.
 *
 * @returns CAIP-2 keyed RPC configuration map.
 */
async function resolveEvmRpcUrlsByCaip2(): Promise<RpcUrlsByCaip2> {
  return {
    ...(await getDefaultEvmRpcUrls()),
    ...parseRpcUrlsFromEnv(),
  };
}

/**
 * Converts CAIP-2 keyed RPC config to the numeric-chain-ID map expected by
 * Exact/Upto EVM schemes.
 *
 * @param rpcUrlsByCaip2 - CAIP-2 keyed RPC configuration map.
 * @returns Record of numeric EIP-155 chain IDs to RPC URL objects.
 */
function buildEvmRpcUrlsByChainId(
  rpcUrlsByCaip2: RpcUrlsByCaip2,
): Record<number, { rpcUrl: string }> {
  const result: Record<number, { rpcUrl: string }> = {};
  for (const [caip2, cfg] of Object.entries(rpcUrlsByCaip2)) {
    const [namespace, chainId] = caip2.split(":");
    if (namespace !== "eip155" || !chainId) continue;
    const numericChainId = Number(chainId);
    if (!Number.isNaN(numericChainId)) {
      result[numericChainId] = cfg;
    }
  }
  return result;
}

/**
 * Selects a payment requirement by original `paymentRequired.accepts` index and
 * returns a normalized PaymentRequired containing only that entry.
 *
 * This preserves the documented semantics of `acceptedIndex` even though
 * `x402Client` internally filters accepts by registered scheme/network before
 * invoking selectors.
 *
 * @param paymentRequired - Original payment requirements from a resource server.
 * @param acceptedIndex - Index into the original `paymentRequired.accepts`.
 * @param capability - The signing networks/schemes the account type supports.
 * @returns A PaymentRequired with exactly one accepted requirement.
 */
function selectAcceptedPaymentRequired(
  paymentRequired: PaymentRequired,
  acceptedIndex: number,
  capability: SigningCapability,
): PaymentRequired {
  const selected = paymentRequired.accepts[acceptedIndex];
  if (!selected) {
    throw new Error(
      `acceptedIndex ${acceptedIndex} is out of range — paymentRequired.accepts has ` +
        `${paymentRequired.accepts.length} entr${paymentRequired.accepts.length === 1 ? "y" : "ies"}.`,
    );
  }
  if (!selected.network.startsWith(`${capability.networkNamespace}:`)) {
    throw new Error(
      `acceptedIndex ${acceptedIndex} targets network "${selected.network}", which a ` +
        `${capability.label} account cannot sign. Choose an index whose network uses the ` +
        `"${capability.networkNamespace}:" namespace.`,
    );
  }
  if (!capability.supportedSchemes.includes(selected.scheme)) {
    throw new Error(
      `acceptedIndex ${acceptedIndex} uses the "${selected.scheme}" scheme, which is not ` +
        `supported for ${capability.label} accounts. Supported schemes: ` +
        `${capability.supportedSchemes.join(", ")}.`,
    );
  }
  return {
    ...paymentRequired,
    accepts: [selected],
  };
}

/**
 * Throws with an actionable message when an EVM payment requirement targets a
 * chain that has no configured RPC URL in the resolved map.
 *
 * Without an RPC, the x402 EVM scheme cannot sign or submit the payment
 * transaction. Base and Base Sepolia resolve an RPC automatically via the
 * CDP-authenticated node endpoint; every other chain requires an explicit
 * RPC via `CDP_X402_RPC_URLS` or `rpcUrls`.
 *
 * @param network - The CAIP-2 network string from the selected requirement.
 * @param rpcUrlsByChainId - The resolved chain-ID-to-RPC-URL map.
 */
function assertEvmRpcConfigured(
  network: string,
  rpcUrlsByChainId: Record<number, { rpcUrl: string }>,
): void {
  const chainId = Number(network.split(":")[1]);
  if (!Number.isNaN(chainId) && rpcUrlsByChainId[chainId] === undefined) {
    throw new Error(
      `No RPC URL configured for ${network}. ` +
        `Provide one via CDP_X402_RPC_URLS='{"${network}":"https://your-rpc-url"}' ` +
        `or rpcUrls: { "${network}": { rpcUrl: "https://your-rpc-url" } } in the SDK configuration.`,
    );
  }
}

/**
 * Resolves a per-network RPC URL override for SVM signing from
 * `CDP_X402_RPC_URLS`, keyed by the selected requirement's CAIP-2 network.
 *
 * The SVM exact scheme provides its own public RPC defaults, so only an
 * explicit override needs to be wired through.
 *
 * @param network - CAIP-2 network identifier of the selected requirement.
 * @returns The override RPC URL, or undefined when none is configured.
 */
function resolveSvmRpcUrlOverride(network: string): string | undefined {
  return parseRpcUrlsFromEnv()[network]?.rpcUrl;
}

/**
 * Signs an x402 payment payload with an EVM server account (EOA).
 *
 * Registers the exact and upto EVM schemes locally using the x402 SDK, then
 * calls `x402Client.createPaymentPayload`. No CDP signing endpoint is used.
 *
 * @param account - The CDP EVM server account.
 * @param options - The x402 payment requirements and selected accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signEvmX402Payment(
  account: ClientEvmSigner,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const rpcUrlsByChainId = buildEvmRpcUrlsByChainId(await resolveEvmRpcUrlsByCaip2());
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    EVM_SIGNING_CAPABILITY,
  );
  const [selected] = selectedPaymentRequired.accepts;
  assertEvmRpcConfigured(selected.network, rpcUrlsByChainId);

  const [{ x402Client }, { registerExactEvmScheme }, { UptoEvmScheme }] = await Promise.all([
    importX402Dependency("@x402/core/client", () => import("@x402/core/client")),
    importX402Dependency("@x402/evm/exact/client", () => import("@x402/evm/exact/client")),
    importX402Dependency("@x402/evm/upto/client", () => import("@x402/evm/upto/client")),
  ]);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account, schemeOptions: rpcUrlsByChainId });
  client.register("eip155:*" as Network, new UptoEvmScheme(account, rpcUrlsByChainId));
  return client.createPaymentPayload(selectedPaymentRequired);
}

/**
 * Signs an x402 payment payload with an EVM smart account.
 *
 * The smart-account adapter derives the CDP network from the EIP-712 domain's
 * `chainId`, so no explicit network parameter is needed on the call site.
 *
 * Smart accounts produce an ERC-1271/ERC-6492 contract signature, which only
 * settles via the EIP-3009 `exact` flow. The `upto` scheme and the Permit2
 * transfer method are rejected because they require an on-chain Permit2
 * allowance owned by an EOA.
 *
 * @param account - The CDP EVM smart account.
 * @param options - The x402 payment requirements and selected accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signEvmSmartAccountX402Payment(
  account: CdpSmartAccount,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const rpcUrlsByChainId = buildEvmRpcUrlsByChainId(await resolveEvmRpcUrlsByCaip2());
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    EVM_SMART_ACCOUNT_SIGNING_CAPABILITY,
  );
  const [selected] = selectedPaymentRequired.accepts;
  assertEvmRpcConfigured(selected.network, rpcUrlsByChainId);
  if (selected.extra?.assetTransferMethod === "permit2") {
    throw new Error(
      `acceptedIndex ${options.acceptedIndex} requires the Permit2 transfer method, which is ` +
        `not supported for EVM smart accounts. Choose a requirement that uses EIP-3009 ` +
        `(transferWithAuthorization).`,
    );
  }

  const [{ x402Client }, { registerExactEvmScheme }, { fromCdpSmartWallet }] = await Promise.all([
    importX402Dependency("@x402/core/client", () => import("@x402/core/client")),
    importX402Dependency("@x402/evm/exact/client", () => import("@x402/evm/exact/client")),
    importX402Dependency(
      "../../x402/account-signers.js",
      () => import("../../x402/account-signers.js"),
    ),
  ]);

  const signer = fromCdpSmartWallet(account);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer, schemeOptions: rpcUrlsByChainId });
  return client.createPaymentPayload(selectedPaymentRequired);
}

/**
 * Signs an x402 payment payload with a Solana account.
 *
 * @param account - The CDP Solana account.
 * @param options - The x402 payment requirements and selected accepted index.
 * @returns The signed x402 payment payload.
 */
export async function signSolanaX402Payment(
  account: CdpSolanaAccount,
  options: SignX402PaymentOptions,
): Promise<PaymentPayload> {
  const selectedPaymentRequired = selectAcceptedPaymentRequired(
    options.paymentRequired,
    options.acceptedIndex,
    SVM_SIGNING_CAPABILITY,
  );
  const [selected] = selectedPaymentRequired.accepts;

  const [
    { x402Client },
    { ExactSvmScheme, registerExactSvmScheme },
    { cdpSolanaAccountToSvmSigner },
  ] = await Promise.all([
    importX402Dependency("@x402/core/client", () => import("@x402/core/client")),
    importX402Dependency("@x402/svm/exact/client", () => import("@x402/svm/exact/client")),
    importX402Dependency(
      "../../x402/account-signers.js",
      () => import("../../x402/account-signers.js"),
    ),
  ]);

  const signer = cdpSolanaAccountToSvmSigner(account);
  const client = new x402Client();
  const rpcUrl = resolveSvmRpcUrlOverride(selected.network);
  if (rpcUrl) {
    /*
     * registerExactSvmScheme ignores RPC overrides, so register the selected
     * network directly with the override. An exact-network registration takes
     * precedence over the "solana:*" wildcard during scheme selection.
     */
    client.register(selected.network as Network, new ExactSvmScheme(signer, { rpcUrl }));
  } else {
    registerExactSvmScheme(client, { signer });
  }
  return client.createPaymentPayload(selectedPaymentRequired);
}
