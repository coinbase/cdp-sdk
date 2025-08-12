// Usage: pnpm tsx solana/transactions/sendManyTransactions.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import "dotenv/config";

import {
    Connection,
    PublicKey,
    SystemProgram,
    SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
    Transaction,
} from "@solana/web3.js";

/**
 * This script demonstrates sending multiple concurrent transactions:
 * 1. Create a new Solana account on CDP
 * 2. Request SOL from CDP faucet
 * 3. Send concurrent transactions (one per destination address) and track their resolution order
 * 4. Wait for all transactions to be confirmed
 */
async function main() {
    const cdp = new CdpClient();

    // Destination addresses - number of these determines number of transactions
    const destinationAddresses = [
        "ANVUJaJoVaJZELtV2AvRp7V5qPV1B84o29zAwDhPj1c2",
        "EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo",
        "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK",
    ];

    // Amount of lamports to send (10 = 0.00000001 SOL)
    const lamportsToSend = 10;

    try {
        const connection = new Connection("https://api.devnet.solana.com");

        // Step 1: Create a new Solana account
        const account = await cdp.solana.createAccount({
            name: "test-sol-account",
        });
        console.log("Successfully created Solana account:", account.address);

        // Step 2: Request SOL from the faucet
        const faucetResp = await cdp.solana.requestFaucet({
            address: account.address,
            token: "sol",
        });
        console.log("Successfully requested SOL from faucet:", faucetResp.signature);

        // Wait for the faucet transaction and check balance
        let balance = 0;
        let attempts = 0;
        const maxAttempts = 30;

        while (balance === 0 && attempts < maxAttempts) {
            balance = await connection.getBalance(new PublicKey(account.address));
            if (balance === 0) {
                console.log("Waiting for funds...");
                await sleep(1000);
                attempts++;
            }
        }

        if (balance === 0) {
            throw new Error("Account not funded after multiple attempts");
        }

        console.log("Account funded with", balance / 1e9, "SOL");

        const totalLamportsNeeded = lamportsToSend * destinationAddresses.length;
        if (balance < totalLamportsNeeded) {
            throw new Error(
                `Insufficient balance: ${balance} lamports, need at least ${totalLamportsNeeded} lamports`
            );
        }

        // Step 3: Create and send concurrent transactions (one per destination)
        const transactions: Promise<{ signature: string; index: number }>[] = [];

        for (let i = 0; i < destinationAddresses.length; i++) {
            const destinationAddress = destinationAddresses[i];

            // Create individual transaction for this destination
            const transaction = new Transaction();
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(account.address),
                    toPubkey: new PublicKey(destinationAddress),
                    lamports: lamportsToSend,
                })
            );

            // A more recent blockhash is set in the backend by CDP
            transaction.recentBlockhash = SYSVAR_RECENT_BLOCKHASHES_PUBKEY.toBase58();
            transaction.feePayer = new PublicKey(account.address);

            const serializedTx = Buffer.from(
                transaction.serialize({ requireAllSignatures: false })
            ).toString("base64");

            // Create a promise that will resolve with the transaction signature and its index
            const txPromise = (async (index: number, destAddr: string) => {
                let retryCount = 0;
                const MAX_RETRIES = 10;
                const BASE_DELAY = 1000; // 1 second

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        const txResult = await cdp.solana.sendTransaction({
                            network: "solana-devnet",
                            transaction: serializedTx,
                        });

                        return { signature: txResult.signature, index };
                    } catch (error) {
                        if (retryCount < MAX_RETRIES) {
                            // Add jitter between 0 and 0.5 of the base delay
                            const jitter = Math.random() * (BASE_DELAY / 2);
                            const delay = BASE_DELAY * Math.pow(2, retryCount) + jitter;

                            console.log(
                                `Rate limit exceeded for transaction #${index} to ${destAddr}, retrying in ${Math.round(
                                    delay
                                )}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
                            );

                            await sleep(delay);
                            retryCount++;
                        } else {
                            throw error;
                        }
                    }
                }
            })(i, destinationAddress);

            transactions.push(txPromise);
        }

        console.log(`Sent ${destinationAddresses.length} concurrent transactions`);

        // Step 4: Wait for all transactions to be confirmed

        // Create a promise for each transaction that waits for its confirmation
        const confirmationPromises = transactions.map(async (txPromise) => {
            const { signature, index } = await txPromise;
            console.log(`Transaction #${index} sent with signature: ${signature}`);
            console.log(`Waiting for confirmation of transaction #${index}...`);

            try {
                const latestBlockhash = await connection.getLatestBlockhash();
                const confirmation = await connection.confirmTransaction({
                    signature,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                });

                console.log(`Transaction #${index} confirmed!`);
                console.log(`- Destination: ${destinationAddresses[index]}`);
                console.log(`- Amount: ${lamportsToSend / 1e9} SOL`);
                console.log(`- Status: ${confirmation.value.err ? "failed" : "success"}`);
                console.log(`- Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

                return {
                    confirmation: confirmation.value.err ? null : confirmation,
                    signature,
                    index,
                    destinationAddress: destinationAddresses[index]
                };
            } catch (error) {
                console.log(`Transaction #${index} timed out waiting for confirmation:`, error);
                return {
                    confirmation: null,
                    signature,
                    index,
                    destinationAddress: destinationAddresses[index]
                };
            }
        });

        // Wait for all confirmation promises to resolve
        const results = await Promise.all(confirmationPromises);

        // Log summary
        const successfulTxs = results.filter((r) => r.confirmation !== null);
        const failedTxs = results.filter((r) => r.confirmation === null);

        console.log("\nTransaction Summary:");
        console.log(`Total transactions: ${results.length}`);
        console.log(`Successful transactions: ${successfulTxs.length}`);
        console.log(`Failed/timed out transactions: ${failedTxs.length}`);

        if (successfulTxs.length > 0) {
            console.log("\nSuccessful transactions in order of confirmation:");
            successfulTxs.forEach(({ signature, index, destinationAddress }) => {
                console.log(
                    `Transaction #${index}: ${signature} -> ${destinationAddress}`
                );
            });
        }

        if (failedTxs.length > 0) {
            console.log("\nFailed transactions:");
            failedTxs.forEach(({ signature, index, destinationAddress }) => {
                console.log(
                    `Transaction #${index}: ${signature} -> ${destinationAddress}`
                );
            });
        }

        return {
            totalTransactions: results.length,
            successfulTransactions: successfulTxs.length,
            failedTransactions: failedTxs.length,
            results
        };

    } catch (error) {
        console.error("Error processing SOL transactions:", error);
        throw error;
    }
}

/**
 * Sleeps for a given number of milliseconds
 *
 * @param {number} ms - The number of milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves when the sleep is complete
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
