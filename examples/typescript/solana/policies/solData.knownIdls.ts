// Usage: pnpm tsx solana/policies/solData.knownIdls.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import "dotenv/config";

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
  JSON.stringify(accountWithSolDataPolicy, null, 2)
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
  policy.id
);

const fromPubkey = new PublicKey(accountWithSolDataPolicy.address);
const goodTransferAmount = BigInt(0.001 * LAMPORTS_PER_SOL);
const transaction = new Transaction().add(
  createAnchorSystemTransferInstruction(goodTransferAmount),
  createAnchorSPLTransferCheckedInstruction(100000, 6),
  createAnchorAssociatedTokenAccountCreateInstruction()
);

transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
transaction.feePayer = fromPubkey;

const serializedTransaction = transaction.serialize({
  requireAllSignatures: false,
});

const base64Transaction = Buffer.from(serializedTransaction).toString("base64");
console.log("Base64 transaction: ", base64Transaction);

const result = await accountWithSolDataPolicy.signTransaction({
  transaction: base64Transaction,
});
console.log("\n✅ Signed transaction: ", result.signedTransaction);

console.log("\n===============================================\n");

console.log("Transaction with bad system transfer instruction: ");
const badSystemTransferAmount = BigInt(0.002 * LAMPORTS_PER_SOL);
const badTransaction = new Transaction().add(
  createAnchorSystemTransferInstruction(badSystemTransferAmount)
);
badTransaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
badTransaction.feePayer = fromPubkey;
const badSerializedTransaction = badTransaction.serialize({
  requireAllSignatures: false,
});
const badBase64Transaction = Buffer.from(badSerializedTransaction).toString(
  "base64"
);
console.log("Bad base64 transaction: ", badBase64Transaction);

try {
  await accountWithSolDataPolicy.signTransaction({
    transaction: badBase64Transaction,
  });
} catch (error) {
  console.log("Expected error while signing bad system transfer transaction: ", error);
}

console.log("\n===============================================\n");

console.log("Transaction with bad token transfer instruction: ");
const badTokenTransferAmount = 200000;
const badTokenTransferTransaction = new Transaction().add(
  createAnchorSPLTransferCheckedInstruction(badTokenTransferAmount, 6)
);
badTokenTransferTransaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
badTokenTransferTransaction.feePayer = fromPubkey;
const badTokenTransferSerializedTransaction = badTokenTransferTransaction.serialize({
  requireAllSignatures: false,
});
const badTokenTransferBase64Transaction = Buffer.from(badTokenTransferSerializedTransaction).toString(
  "base64"
);
console.log("Bad token transfer base64 transaction: ", badTokenTransferBase64Transaction);
try {
  await accountWithSolDataPolicy.signTransaction({
    transaction: badTokenTransferBase64Transaction,
  });
} catch (error) {
  console.log("Expected error while signing bad token transfer transaction: ", error);
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
 * @returns TransactionInstruction for an Anchor-formatted system transfer
 */
function createAnchorSystemTransferInstruction(
  amount: bigint
): TransactionInstruction {
  const testAccount = Keypair.generate().publicKey;
  const transferDiscriminator = Buffer.from([
    163, 52, 200, 231, 140, 3, 69, 186,
  ]);

  const lamportsBuffer = Buffer.alloc(8);
  lamportsBuffer.writeBigUInt64LE(amount, 0);

  const instructionData = Buffer.concat([
    transferDiscriminator,
    lamportsBuffer,
  ]);

  return new TransactionInstruction({
    keys: [
      // Irrelevant for our instruction decoding purposes
      { pubkey: testAccount, isSigner: true, isWritable: true },
      { pubkey: testAccount, isSigner: false, isWritable: true },
    ],
    programId: new PublicKey("11111111111111111111111111111111"),
    data: instructionData,
  });
}

/**
 * Creates an Anchor-formatted token transfer_checked instruction
 *
 * @param amount - Amount of tokens to transfer
 * @param decimals - Number of decimals for the token
 * @returns TransactionInstruction for an Anchor-formatted token transfer_checked
 */
function createAnchorSPLTransferCheckedInstruction(
  amount: number,
  decimals: number
): TransactionInstruction {
  const testAccount = Keypair.generate().publicKey;
  const transferCheckedDiscriminator = Buffer.from([119, 250, 202, 24, 253, 135, 244, 121]);

  // Serialize the arguments: amount (u64) + decimals (u8)
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount), 0);
  const decimalsBuffer = Buffer.alloc(1);
  decimalsBuffer.writeUInt8(decimals, 0);

  const instructionData = Buffer.concat([transferCheckedDiscriminator, amountBuffer, decimalsBuffer]);

  return new TransactionInstruction({
    keys: [
      // Irrelevant for our instruction decoding purposes
      { pubkey: testAccount, isSigner: false, isWritable: true },
      { pubkey: testAccount, isSigner: false, isWritable: false },
      { pubkey: testAccount, isSigner: false, isWritable: true },
      { pubkey: testAccount, isSigner: true, isWritable: false },
    ],
    programId: new PublicKey(TOKEN_PROGRAM_ADDRESS),
    data: instructionData
  });
}

/**
 * Creates an Anchor-formatted associated token account create instruction
 */
function createAnchorAssociatedTokenAccountCreateInstruction(): TransactionInstruction {
  const testAccount = Keypair.generate().publicKey;
  const createDiscriminator = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

  const instructionData = Buffer.concat([createDiscriminator]);

  return new TransactionInstruction({
    keys: [
      // Irrelevant for our instruction decoding purposes
      { pubkey: testAccount, isSigner: true, isWritable: true },
      { pubkey: testAccount, isSigner: false, isWritable: true },
      { pubkey: testAccount, isSigner: false, isWritable: false },
      { pubkey: testAccount, isSigner: false, isWritable: false },
      { pubkey: testAccount, isSigner: false, isWritable: false },
      { pubkey: testAccount, isSigner: false, isWritable: false },
    ],
    programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ADDRESS),
    data: instructionData
  });
}
