// Usage: pnpm tsx end-users/importEndUser.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const cdp = new CdpClient();

try {
    // Generate a random private key and derive the EVM address.
    const privateKey = generatePrivateKey();
    const viemAccount = privateKeyToAccount(privateKey);
    console.log("Generated address:", viemAccount.address);

    // Import the end user with the private key.
    const endUser = await cdp.endUser.importEndUser({
        authenticationMethods: [
            { type: "email", email: "test@example.com" },
        ],
        privateKey: privateKey,
        keyType: "evm",
    });

    console.log("Imported end user:", endUser);
    console.log("End user EVM accounts:", endUser.evmAccountObjects);

    // Fund the address with testnet ETH using the faucet.
    console.log("Requesting faucet funds...");
    const { transactionHash } = await cdp.evm.requestFaucet({
        address: viemAccount.address,
        network: "base-sepolia",
        token: "eth",
    });
    console.log(
        `Faucet funds requested. Explorer: https://sepolia.basescan.org/tx/${transactionHash}`
    );
} catch (error) {
    console.error(
        "Error importing end user:",
        (error as { errorMessage?: string }).errorMessage ?? error
    );
}
