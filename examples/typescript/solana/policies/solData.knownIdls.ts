// Usage: pnpm tsx solana/policies/solData.knownIdls.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import {
  address as solanaAddress,
  AccountRole,
  appendTransactionMessageInstructions,
  Blockhash,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  Instruction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import "dotenv/config";

const LAMPORTS_PER_SOL = 1_000_000_000;
// A more recent blockhash is set in the backend by CDP
const FAKE_BLOCKHASH =
  "SysvarRecentB1ockHashes11111111111111111111" as Blockhash;
// Placeholder account address used for instruction accounts (irrelevant for decoding purposes).
// Must not be the System Program address since that would conflict with programAddress in compiled txs.
const TEST_ACCOUNT = solanaAddress("3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE");

const cdp = new CdpClient();

const policy = await cdp.policies.createPolicy({
  policy: {
    scope: "account",
    description: "Create solData account policy",
    rules: [
      {
        action: "accept",
        operation: "signSolTransaction",
        criteria: [
          {
            type: "solData",
            idls: ["SystemProgram", "TokenProgram", "AssociatedTokenProgram"],
            conditions: [
              {
                instruction: "transfer",
                params: [
                  {
                    name: "lamports",
                    operator: "<=",
                    value: "1000000",
                  },
                ],
              },
              {
                instruction: "transfer_checked",
                params: [
                  {
                    name: "amount",
                    operator: "<=",
                    value: "100000",
                  },
                  {
                    name: "decimals",
                    operator: "==",
                    value: "6",
                  },
                ],
              },
              {
                instruction: "create",
              },
            ],
          },
        ],
      },
    ],
  },
});
console.log("Created solData policy: ", policy.id);

const accountWithSolDataPolicy = await cdp.solana.getOrCreateAccount({
  name: "ZalDevDev1",
});
console.log(
  "Account with solData policy: ",
  JSON.stringify(accountWithSolDataPolicy, null, 2),
);

await cdp.solana.updateAccount({
  address: accountWithSolDataPolicy.address,
  update: {
    accountPolicy: policy.id,
  },
});
console.log(
  "Updated account ",
  accountWithSolDataPolicy.address,
  " with solData policy: ",
  policy.id,
);

const fromPubkey = solanaAddress(accountWithSolDataPolicy.address);
const goodTransferAmount = BigInt(0.001 * LAMPORTS_PER_SOL);

const txMsg = pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayer(fromPubkey, tx),
  (tx) =>
    setTransactionMessageLifetimeUsingBlockhash(
      { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
      tx,
    ),
  (tx) =>
    appendTransactionMessageInstructions(
      [
        createAnchorSystemTransferInstruction(goodTransferAmount),
        createAnchorSPLTransferCheckedInstruction(100000, 6),
        createAnchorAssociatedTokenAccountCreateInstruction(),
      ],
      tx,
    ),
);

const base64Transaction = getBase64EncodedWireTransaction(
  compileTransaction(txMsg),
);
console.log("Base64 transaction: ", base64Transaction);

const result = await accountWithSolDataPolicy.signTransaction({
  transaction: base64Transaction,
});
console.log("\n✅ Signed transaction: ", result.signedTransaction);

console.log("\n===============================================\n");

console.log("Transaction with bad system transfer instruction: ");
const badSystemTransferAmount = BigInt(0.002 * LAMPORTS_PER_SOL);
const badTxMsg = pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayer(fromPubkey, tx),
  (tx) =>
    setTransactionMessageLifetimeUsingBlockhash(
      { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
      tx,
    ),
  (tx) =>
    appendTransactionMessageInstructions(
      [createAnchorSystemTransferInstruction(badSystemTransferAmount)],
      tx,
    ),
);
const badBase64Transaction = getBase64EncodedWireTransaction(
  compileTransaction(badTxMsg),
);
console.log("Bad base64 transaction: ", badBase64Transaction);

try {
  await accountWithSolDataPolicy.signTransaction({
    transaction: badBase64Transaction,
  });
} catch (error) {
  console.log(
    "Expected error while signing bad system transfer transaction: ",
    error,
  );
}

console.log("\n===============================================\n");

console.log("Transaction with bad token transfer instruction: ");
const badTokenTransferAmount = 200000;
const badTokenTxMsg = pipe(
  createTransactionMessage({ version: "legacy" }),
  (tx) => setTransactionMessageFeePayer(fromPubkey, tx),
  (tx) =>
    setTransactionMessageLifetimeUsingBlockhash(
      { blockhash: FAKE_BLOCKHASH, lastValidBlockHeight: 9999999n },
      tx,
    ),
  (tx) =>
    appendTransactionMessageInstructions(
      [createAnchorSPLTransferCheckedInstruction(badTokenTransferAmount, 6)],
      tx,
    ),
);
const badTokenTransferBase64Transaction = getBase64EncodedWireTransaction(
  compileTransaction(badTokenTxMsg),
);
console.log(
  "Bad token transfer base64 transaction: ",
  badTokenTransferBase64Transaction,
);
try {
  await accountWithSolDataPolicy.signTransaction({
    transaction: badTokenTransferBase64Transaction,
  });
} catch (error) {
  console.log(
    "Expected error while signing bad token transfer transaction: ",
    error,
  );
}

console.log("Removing policy from account...");
await cdp.solana.updateAccount({
  address: accountWithSolDataPolicy.address,
  update: {
    accountPolicy: "",
  },
});

console.log("Deleting policy...");
await cdp.policies.deletePolicy({ id: policy.id });
console.log("Policy deleted: ", policy.id);

/**
 * Creates an Anchor-formatted system transfer instruction
 *
 * @param amount - Amount in lamports to transfer
 * @returns Instruction for an Anchor-formatted system transfer
 */
function createAnchorSystemTransferInstruction(amount: bigint): Instruction {
  const transferDiscriminator = new Uint8Array([
    163, 52, 200, 231, 140, 3, 69, 186,
  ]);

  const lamportsBuffer = new Uint8Array(8);
  new DataView(lamportsBuffer.buffer).setBigUint64(0, amount, true);

  const data = new Uint8Array(
    transferDiscriminator.length + lamportsBuffer.length,
  );
  data.set(transferDiscriminator);
  data.set(lamportsBuffer, transferDiscriminator.length);

  return {
    programAddress: solanaAddress("11111111111111111111111111111111"),
    accounts: [
      // Irrelevant for our instruction decoding purposes
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE_SIGNER },
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE },
    ],
    data,
  };
}

/**
 * Creates an Anchor-formatted token transfer_checked instruction
 *
 * @param amount - Amount of tokens to transfer
 * @param decimals - Number of decimals for the token
 * @returns Instruction for an Anchor-formatted token transfer_checked
 */
function createAnchorSPLTransferCheckedInstruction(
  amount: number,
  decimals: number,
): Instruction {
  const transferCheckedDiscriminator = new Uint8Array([
    119, 250, 202, 24, 253, 135, 244, 121,
  ]);

  // Serialize the arguments: amount (u64) + decimals (u8)
  const amountBuffer = new Uint8Array(8);
  new DataView(amountBuffer.buffer).setBigUint64(0, BigInt(amount), true);
  const decimalsBuffer = new Uint8Array([decimals]);

  const data = new Uint8Array(
    transferCheckedDiscriminator.length +
      amountBuffer.length +
      decimalsBuffer.length,
  );
  data.set(transferCheckedDiscriminator);
  data.set(amountBuffer, transferCheckedDiscriminator.length);
  data.set(
    decimalsBuffer,
    transferCheckedDiscriminator.length + amountBuffer.length,
  );

  return {
    programAddress: solanaAddress(TOKEN_PROGRAM_ADDRESS),
    accounts: [
      // Irrelevant for our instruction decoding purposes
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY },
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY_SIGNER },
    ],
    data,
  };
}

/**
 * Creates an Anchor-formatted associated token account create instruction
 */
function createAnchorAssociatedTokenAccountCreateInstruction(): Instruction {
  const createDiscriminator = new Uint8Array([24, 30, 200, 40, 5, 28, 7, 119]);

  return {
    programAddress: solanaAddress(ASSOCIATED_TOKEN_PROGRAM_ADDRESS),
    accounts: [
      // Irrelevant for our instruction decoding purposes
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE_SIGNER },
      { address: TEST_ACCOUNT, role: AccountRole.WRITABLE },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY },
      { address: TEST_ACCOUNT, role: AccountRole.READONLY },
    ],
    data: createDiscriminator,
  };
}
