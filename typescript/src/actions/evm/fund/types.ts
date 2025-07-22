import { TransferStatus } from "../../../openapi-client/index.js";

export type FundOperationResult = {
  /** The transfer that was created to fund the account. */
  id: string;
  /** The network that the transfer was created on. */
  network: string;
  /** The target amount that will be received. */
  targetAmount: string;
  /** The currency that will be received. */
  targetCurrency: string;
  /** The status of the fund operation. */
  status: TransferStatus;
  /** The transaction hash of the transfer. */
  transactionHash?: string;
};
