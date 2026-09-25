import { describe, it, expect, vi, beforeEach } from "vitest";

import { AccountsClient } from "../_vendor/api/resources/accounts/client/Client.js";
import { DepositDestinationsClient } from "../_vendor/api/resources/depositDestinations/client/Client.js";
import { PaymentMethodsClient } from "../_vendor/api/resources/paymentMethods/client/Client.js";
import { TransfersClient } from "../_vendor/api/resources/transfers/client/Client.js";
import { CdpClient } from "./cdp.js";
import { createAxiosFetch } from "./vendored.js";

const request = vi.fn();
const getUri = vi.fn(() => "https://api.cdp.coinbase.com/platform");

vi.mock("../openapi-client", () => {
  return {
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
