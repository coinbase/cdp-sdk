import { FundOperationResult } from "./types.js";
import { CdpOpenApiClientType } from "../../../openapi-client/index.js";

/**
 * A class representing a funding quote that can be executed.
 */
export class Quote {
  /** Quote for the transfer. */
  public quoteId: string;
  /** Network to transfer the funds to. */
  public network: "base" | "ethereum";
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

  private apiClient: CdpOpenApiClientType;

  /**
   * Creates a new Quote instance.
   *
   * @param apiClient - The API client.
   * @param quoteId - The quote ID.
   * @param network - The network to transfer funds to.
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
    this.apiClient = apiClient;
    this.quoteId = quoteId;
    this.network = network;
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
