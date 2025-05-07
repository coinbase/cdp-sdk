import { AccountActions } from "../../actions/solana/types.js";
import { SolanaAccount as OpenAPISolanaAccount } from "../../openapi-client/index.js";
import { Prettify } from "../../types/utils.js";

/**
 * A base Solana account.
 */
export type Account = OpenAPISolanaAccount;

/**
 * A Solana account with actions.
 */
export type SolanaAccount = Prettify<OpenAPISolanaAccount & AccountActions>;
