// Usage: pnpm tsx evm/accounts/signMessage.ts

import { CdpClient } from "@coinbase/cdp-sdk";
import { hashMessage, recoverAddress } from "viem";
import type { Hex } from "viem";
import "dotenv/config";

/**
 * Result of a signMessage test case
 */
interface TestResult {
  name: string;
  message: string | { raw: Hex | Uint8Array };
  signature?: string;
  expectedHash?: string;
  recoveredAddress?: string;
  matchesExpected?: boolean;
  error?: string;
}

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({
  name: "SignMessageExample",
});

console.log("Created account:", account.address);
console.log("\n" + "=".repeat(80));
console.log("Testing signMessage with different message formats");
console.log("=".repeat(80) + "\n");

const testResults: TestResult[] = [];

// Test 1: Plain string message
console.log("Test 1: Plain string message");
let message = "Hello World";
let signature = await account.signMessage({ message });
let expectedHash = hashMessage(message);
let recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

let result: TestResult = {
  name: "Plain string message",
  message,
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(`  Message: "${message}"`);
console.log(`  Expected Hash: ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}

console.log("");

// Test 2: Hex-encoded string (should be treated as raw bytes)
console.log("Test 2: Hex-encoded string (raw bytes)");
let hexMessage = "0x48656c6c6f20576f726c64" as Hex; // "Hello World" in hex
signature = await account.signMessage({ message: hexMessage });
expectedHash = hashMessage(hexMessage);
recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

result = {
  name: 'Hex-encoded string ("Hello World")',
  message: hexMessage,
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(`  Message (hex): ${hexMessage}`);
console.log(`  Expected Hash: ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}

console.log("");

// Test 3: { raw: hex } with UTF-8 text (should match plain string)
console.log("Test 3: { raw: hex } format with UTF-8 text");
hexMessage = "0x48656c6c6f20576f726c64" as Hex; // "Hello World" in hex
signature = await account.signMessage({ message: { raw: hexMessage } });
expectedHash = hashMessage({ raw: hexMessage });
recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

result = {
  name: '{ raw: hex } UTF-8 text ("Hello World")',
  message: { raw: hexMessage },
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(`  Message: { raw: "${hexMessage}" }`);
console.log(`  Expected Hash: ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}
console.log(
  `  Note: This should produce the same hash as plain string "Hello World" since both have 11 bytes`
);

console.log("");

// Test 4: { raw: hex } with binary data (32-byte hash)
console.log("Test 4: { raw: hex } binary data (32-byte hash)");
const binaryDataHex =
  "0x69e540c217c8af830886c5a81e5c617f71fa7ab913488233406b9bfbc12b31be" as Hex;
signature = await account.signMessage({
  message: { raw: binaryDataHex },
});
expectedHash = hashMessage({ raw: binaryDataHex });
recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

result = {
  name: "{ raw: hex } binary data (32-byte hash)",
  message: { raw: binaryDataHex },
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(`  Message: { raw: "${binaryDataHex}" }`);
console.log(`  Expected Hash: ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}

console.log("");

// Test 5: Pre-hashed message (double-hash scenario)
console.log("Test 5: Pre-hashed message (double-hash scenario)");
const originalMessage = "Hello";
const preHashedMessage = hashMessage(originalMessage);
signature = await account.signMessage({
  message: { raw: preHashedMessage },
});
// Note: This will have EIP-191 applied twice
expectedHash = hashMessage({ raw: preHashedMessage });
recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

result = {
  name: "Pre-hashed message",
  message: { raw: preHashedMessage },
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(`  Original Message: "${originalMessage}"`);
console.log(`  Pre-hashed: ${preHashedMessage}`);
console.log(`  Expected Hash (double): ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}
console.log(`  Note: EIP-191 is applied twice in this scenario`);

console.log("");

// Test 6: Object format with Uint8Array
console.log("Test 6: Object format with Uint8Array");
const byteArray = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
signature = await account.signMessage({ message: { raw: byteArray } });
expectedHash = hashMessage({ raw: byteArray });
recoveredAddress = await recoverAddress({
  hash: expectedHash,
  signature: signature as Hex,
});

result = {
  name: "Object format with Uint8Array",
  message: { raw: byteArray },
  signature,
  expectedHash,
  recoveredAddress,
  matchesExpected:
    recoveredAddress.toLowerCase() === account.address.toLowerCase(),
};

testResults.push(result);

console.log(
  `  Message: { raw: Uint8Array([72, 101, 108, 108, 111]) } - "Hello"`
);
console.log(`  Expected Hash: ${expectedHash}`);
console.log(`  Signature: ${signature}`);
console.log(`  Recovered Address: ${recoveredAddress}`);
if (result.matchesExpected) {
  console.log("  ✅ Success: addresses match!");
} else {
  console.log("  ❌ Error: addresses do not match");
}
