import { TransferOptions, TransferResult } from "./transfer/types.js";

export type Actions = {
  /**
   * Transfer an amount of a token from an account to another account.
   *
   * @param options - The options for the transfer.
   * @param options.to - The account or 0x-prefixed address to transfer the token to.
   * @param options.amount - The amount of the token to transfer.
   * @param options.token - The token to transfer.
   * @param options.network - The network to transfer the token on.
   *
   * @returns The result of the transfer.
   *
   * @example
   * ```typescript
   * const { status } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: "0.01",
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Pass a bigint value**
   * ```typescript
   * const { status } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: 10000n, // equivalent to 0.01 usdc
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer from a smart account**
   * ```typescript
   * const sender = await cdp.evm.createSmartAccount({
   *   owner: await cdp.evm.createAccount({ name: "Owner" }),
   * });
   *
   * const { status } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: "0.01",
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer ETH**
   * ```typescript
   * const { status } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: "0.000001",
   *   token: "eth",
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Using a contract address**
   * ```typescript
   * const { status } = await sender.transfer({
   *   to: "0x9F663335Cd6Ad02a37B633602E98866CF944124d",
   *   amount: "0.000001",
   *   token: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
   *   network: "base-sepolia",
   * });
   * ```
   *
   * @example
   * **Transfer to another account**
   * ```typescript
   * const sender = await cdp.evm.createAccount({ name: "Sender" });
   * const receiver = await cdp.evm.createAccount({ name: "Receiver" });
   *
   * const { status } = await sender.transfer({
   *   to: receiver,
   *   amount: "0.01",
   *   token: "usdc",
   *   network: "base-sepolia",
   * });
   * ```
   */
  transfer: (options: TransferOptions) => Promise<TransferResult>;
};
