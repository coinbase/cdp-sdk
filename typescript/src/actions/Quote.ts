import { FundOperationResult } from "./types.js";
import { CdpOpenApiClientType } from "../openapi-client/index.js";

/**
 * Base class representing a funding quote that can be executed.
 */
abstract class BaseQuote {
  /** Quote for the transfer. */
  public quoteId: string;
  /** The amount in fiat currency. */
  public fiatAmount: string;
  /** The fiat currency. */
  public fiatCurrency: string;
  /** The amount in the token to transfer. */
  public tokenAmount: string;
  /** The token to transfer. */
  public token: string;
  /** Fees in the token to transfer. */
  public fees: {
    /** The type of fee. */
    type: "exchange_fee" | "network_fee";
    amount: string;
    currency: string;
  }[];

  protected apiClient: CdpOpenApiClientType;

  /**
   * Creates a new BaseQuote instance.
   *
   * @param apiClient - The API client.
   * @param quoteId - The quote ID.
   * @param fiatAmount - The amount in fiat currency.
   * @param fiatCurrency - The fiat currency.
   * @param tokenAmount - The amount in the token to transfer.
   * @param token - The token to transfer.
   * @param fees - Fees for the transfer.
   */
  constructor(
    apiClient: CdpOpenApiClientType,
    quoteId: string,
    fiatAmount: string,
    fiatCurrency: string,
    tokenAmount: string,
    token: string,
    fees: {
      type: "exchange_fee" | "network_fee";
      amount: string;
      currency: string;
    }[],
  ) {
    this.apiClient = apiClient;
    this.quoteId = quoteId;
    this.fiatAmount = fiatAmount;
    this.fiatCurrency = fiatCurrency;
    this.tokenAmount = tokenAmount;
    this.token = token;
    this.fees = fees;
  }

  /**
   * Executes the quote to perform the actual fund transfer.
   *
   * @returns A promise that resolves to the result of the executed quote.
   */
  async execute(): Promise<FundOperationResult> {
    const transfer = await this.apiClient.executePaymentTransferQuote(this.quoteId);

    return {
      id: transfer.id,
      network: transfer.target.network,
      targetAmount: transfer.targetAmount,
      targetCurrency: transfer.targetCurrency,
      status: transfer.status,
      transactionHash: transfer.transactionHash,
    };
  }
}

/**
 * A class representing an EVM funding quote that can be executed.
 */
export class EvmQuote extends BaseQuote {
  /** Network to transfer the funds to (EVM networks). */
  public network: "base" | "ethereum";

  /**
   * Creates a new EvmQuote instance.
   *
   * @param apiClient - The API client.
   * @param quoteId - The quote ID.
   * @param network - The EVM network to transfer funds to.
   * @param fiatAmount - The amount in fiat currency.
   * @param fiatCurrency - The fiat currency.
   * @param tokenAmount - The amount in the token to transfer.
   * @param token - The token to transfer.
   * @param fees - Fees for the transfer.
   */
  constructor(
    apiClient: CdpOpenApiClientType,
    quoteId: string,
    network: "base" | "ethereum",
    fiatAmount: string,
    fiatCurrency: string,
    tokenAmount: string,
    token: string,
    fees: {
      type: "exchange_fee" | "network_fee";
      amount: string;
      currency: string;
    }[],
  ) {
    super(apiClient, quoteId, fiatAmount, fiatCurrency, tokenAmount, token, fees);
    this.network = network;
  }
}

/**
 * A class representing a Solana funding quote that can be executed.
 */
export class SolanaQuote extends BaseQuote {
  /** Network to transfer the funds to (Solana). */
  public network: "solana";

  /**
   * Creates a new SolanaQuote instance.
   *
   * @param apiClient - The API client.
   * @param quoteId - The quote ID.
   * @param network - The Solana network to transfer funds to.
   * @param fiatAmount - The amount in fiat currency.
   * @param fiatCurrency - The fiat currency.
   * @param tokenAmount - The amount in the token to transfer.
   * @param token - The token to transfer.
   * @param fees - Fees for the transfer.
   */
  constructor(
    apiClient: CdpOpenApiClientType,
    quoteId: string,
    network: "solana",
    fiatAmount: string,
    fiatCurrency: string,
    tokenAmount: string,
    token: string,
    fees: {
      type: "exchange_fee" | "network_fee";
      amount: string;
      currency: string;
    }[],
  ) {
    super(apiClient, quoteId, fiatAmount, fiatCurrency, tokenAmount, token, fees);
    this.network = network;
  }
}
