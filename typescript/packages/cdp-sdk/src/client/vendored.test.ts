import { describe, it, expect, vi, beforeEach } from "vitest";

import { AccountsClient } from "../_vendor/api/resources/accounts/client/Client.js";
import { DepositDestinationsClient } from "../_vendor/api/resources/depositDestinations/client/Client.js";
import { LendClient } from "../_vendor/api/resources/lend/client/Client.js";
import { PaymentMethodsClient } from "../_vendor/api/resources/paymentMethods/client/Client.js";
import { TransfersClient } from "../_vendor/api/resources/transfers/client/Client.js";
import { redeemVaultFeesWithSmartAccount } from "../actions/evm/redeemVaultFees.js";
import { CdpClient } from "./cdp.js";
import { createAxiosFetch, lendApiClient } from "./vendored.js";
import { CoinbaseApiError } from "../_vendor/index.js";

const request = vi.fn();
const getUri = vi.fn(() => "https://api.cdp.coinbase.com/platform");

vi.mock("../openapi-client", () => {
  return {
    EvmUserOperationStatus: { broadcast: "broadcast" },
    CdpOpenApiClient: {
      configure: vi.fn(),
      getAxiosInstance: () => ({ request, getUri }),
    },
  };
});

describe("createAxiosFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ ok: true }),
    });
  });

  it("strips the configured base and passes a relative URL to axios", async () => {
    const fetchFn = createAxiosFetch();

    await fetchFn("https://api.cdp.coinbase.com/platform/v2/accounts?pageSize=1", {
      method: "GET",
      headers: { "X-Custom": "abc" },
    });

    expect(request).toHaveBeenCalledTimes(1);
    const cfg = request.mock.calls[0][0];
    expect(cfg.url).toBe("/v2/accounts?pageSize=1");
    expect(cfg.method).toBe("GET");
    expect(cfg.headers).toMatchObject({ "x-custom": "abc" });
    expect(cfg.validateStatus()).toBe(true);
  });

  it("parses a serialized JSON body back into an object for axios", async () => {
    const fetchFn = createAxiosFetch();

    await fetchFn("https://api.cdp.coinbase.com/platform/v2/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "foundation", amount: 5 }),
    });

    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("POST");
    expect(cfg.data).toEqual({ name: "foundation", amount: 5 });
  });

  it("translates the axios response into a fetch Response", async () => {
    const fetchFn = createAxiosFetch();

    const res = await fetchFn("https://api.cdp.coinbase.com/platform/v2/accounts");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("does not throw on non-2xx (lets the caller own status handling)", async () => {
    request.mockResolvedValueOnce({
      status: 404,
      statusText: "Not Found",
      headers: {},
      data: JSON.stringify({ errorType: "not_found" }),
    });
    const fetchFn = createAxiosFetch();

    const res = await fetchFn("https://api.cdp.coinbase.com/platform/v2/accounts/missing");

    expect(res.status).toBe(404);
  });
});

describe("lendApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends requests through the configured axios instance", async () => {
    const vault = { vaultId: "vault_x" };
    request.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: JSON.stringify(vault),
    });

    await expect(lendApiClient.getVault({ vaultId: "vault_x" })).resolves.toEqual(vault);
    expect(request.mock.calls[0][0]).toMatchObject({
      url: "/v2/lend/vaults/vault_x",
      method: "GET",
    });
  });

  it("throws a CoinbaseApiError with the status code when a request fails", async () => {
    request.mockResolvedValueOnce({
      status: 404,
      statusText: "Not Found",
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ errorType: "not_found" }),
    });

    const error = await lendApiClient.getVault({ vaultId: "vault_x" }).catch(e => e);

    expect(error).toBeInstanceOf(CoinbaseApiError);
    expect(error.statusCode).toBe(404);
  });

  it("sends a bigint in the paymaster context as a decimal string", async () => {
    request.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ userOpHash: "0x1234" }),
    });

    await redeemVaultFeesWithSmartAccount({
      address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      vaultId: "vault_x",
      paymasterUrl: "https://paymaster.example.com",
      paymasterContext: { spendingLimit: 1000000000000000000n },
    });

    expect(request.mock.calls[0][0].data).toMatchObject({
      paymasterContext: { spendingLimit: "1000000000000000000" },
    });
  });
});

describe("lend withdraw requests", () => {
  const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const vaultId = "vault_019f5f10-096a-7a23-86df-f479650d813f";
  const idempotencyKey = "8e03978e-40d5-43e8-bc93-6894a57f9324";

  const withdrawals = [
    {
      name: "withdrawFromVaultWithEvmAccount",
      withdraw: lendApiClient.withdrawFromVaultWithEvmAccount.bind(lendApiClient),
      url: `/v2/evm/accounts/${address}/lend/withdraw`,
      response: { transactionHash: "0xabc" },
    },
    {
      name: "withdrawFromVaultWithEvmSmartAccount",
      withdraw: lendApiClient.withdrawFromVaultWithEvmSmartAccount.bind(lendApiClient),
      url: `/v2/evm/smart-accounts/${address}/lend/withdraw`,
      response: { userOpHash: "0xdef" },
    },
  ];

  const respondWith = (status: number, data: unknown) =>
    request.mockResolvedValueOnce({
      status,
      statusText: "",
      headers: { "content-type": "application/json" },
      data: JSON.stringify(data),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(withdrawals)("$name sends an amount withdrawal", async ({ withdraw, url, response }) => {
    respondWith(200, response);

    await expect(
      withdraw({ address, vaultId, amount: "25.50", maxSlippageBps: 50, idempotencyKey }),
    ).resolves.toEqual(response);

    const cfg = request.mock.calls[0][0];
    expect(cfg).toMatchObject({ url, method: "POST" });
    expect(cfg.data).toEqual({ vaultId, amount: "25.50", maxSlippageBps: 50 });
    expect(cfg.headers["x-idempotency-key"]).toBe(idempotencyKey);
  });

  it.each(withdrawals)("$name sends a withdraw-all withdrawal", async ({ withdraw, response }) => {
    respondWith(200, response);

    await withdraw({ address, vaultId, withdrawAll: true });

    const cfg = request.mock.calls[0][0];
    expect(cfg.data).toEqual({ vaultId, withdrawAll: true });
    expect(cfg.headers["x-idempotency-key"]).toBeUndefined();
  });

  it.each(withdrawals)("$name throws a CoinbaseApiError on a 409", async ({ withdraw }) => {
    respondWith(409, { errorType: "operation_in_progress" });

    const error = await withdraw({ address, vaultId, withdrawAll: true }).catch(e => e);

    expect(error).toBeInstanceOf(CoinbaseApiError);
    expect(error.statusCode).toBe(409);
  });
});

describe("CdpClient inherits the generated resource clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the generated resources via inheritance", () => {
    const cdp = new CdpClient({
      apiKeyId: "test-api-key-id",
      apiKeySecret: "test-api-key-secret",
      walletSecret: "test-wallet-secret",
    });

    expect(cdp.accounts).toBeInstanceOf(AccountsClient);
    expect(cdp.transfers).toBeInstanceOf(TransfersClient);
    expect(cdp.depositDestinations).toBeInstanceOf(DepositDestinationsClient);
    expect(cdp.paymentMethods).toBeInstanceOf(PaymentMethodsClient);
    expect(cdp.lend).toBeInstanceOf(LendClient);
    expect(typeof cdp.fetch).toBe("function");
  });
});

describe("custodial request bodies and idempotency headers", () => {
  const idempotencyKey = "8e03978e-40d5-43e8-bc93-6894a57f9324";

  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: JSON.stringify({}),
    });
  });

  const newClient = () =>
    new CdpClient({
      apiKeyId: "test-api-key-id",
      apiKeySecret: "test-api-key-secret",
      walletSecret: "test-wallet-secret",
    });

  it("sends X-Idempotency-Key when accounts.createAccount is given an idempotencyKey", async () => {
    const cdp = newClient();

    await cdp.accounts.createAccount({ idempotencyKey, name: "test-account" });

    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toContain("/v2/accounts");
    expect(cfg.headers["x-idempotency-key"]).toBe(idempotencyKey);
  });

  it("sends the customer owner when creating a custodial account", async () => {
    const cdp = newClient();
    const owner = "customer_af2937b0-9846-4fe7-bfe9-ccc22d935114";
    const name = "ABC XYZ Customer Account";

    await cdp.accounts.createAccount({ owner, name, idempotencyKey });

    expect(request).toHaveBeenCalledTimes(1);
    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toBe("/v2/accounts");
    expect(cfg.data).toEqual({ owner, name });
    expect(cfg.headers["x-idempotency-key"]).toBe(idempotencyKey);
  });

  it("omits owner when creating an entity-owned account", async () => {
    const cdp = newClient();

    await cdp.accounts.createAccount({ name: "My Business Account" });

    expect(request.mock.calls[0][0].data).toEqual({ name: "My Business Account" });
  });

  it("still allows creating an entity-owned account without a request", async () => {
    const cdp = newClient();

    await cdp.accounts.createAccount();

    expect(request.mock.calls[0][0].data).toEqual({});
  });

  it("sends X-Idempotency-Key when transfers.createTransfer is given an idempotencyKey", async () => {
    const cdp = newClient();

    await cdp.transfers.createTransfer({
      idempotencyKey,
      source: { accountId: "account_x", asset: "usd" },
      target: {
        address: "0x0000000000000000000000000000000000000000",
        network: "base",
        asset: "usdc",
      },
      amount: "1.00",
      asset: "usd",
      execute: false,
    });

    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toContain("/v2/transfers");
    expect(cfg.headers["x-idempotency-key"]).toBe(idempotencyKey);
  });

  it("sends X-Idempotency-Key when depositDestinations.createDepositDestination is given an idempotencyKey", async () => {
    const cdp = newClient();

    await cdp.depositDestinations.createDepositDestination({
      idempotencyKey,
      type: "crypto",
      accountId: "account_x",
      target: { accountId: "account_x", asset: "usdc" },
      crypto: { network: "base" },
    });

    const cfg = request.mock.calls[0][0];
    expect(cfg.method).toBe("POST");
    expect(cfg.url).toContain("/v2/deposit-destinations");
    expect(cfg.headers["x-idempotency-key"]).toBe(idempotencyKey);
  });

  it("omits X-Idempotency-Key when no idempotencyKey is provided", async () => {
    const cdp = newClient();

    await cdp.accounts.createAccount({ name: "test-account" });

    const cfg = request.mock.calls[0][0];
    expect(cfg.headers["x-idempotency-key"]).toBeUndefined();
  });
});
