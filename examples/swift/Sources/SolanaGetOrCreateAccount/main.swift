// Usage: swift run SolanaGetOrCreateAccount
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

let account = try await cdp.solana.getOrCreateAccount(name: "Account1")
print("Account: \(account.address)")

// Verify we can retrieve it by address
let account2 = try await cdp.solana.getAccount(address: account.address)
print("Same address? \(account.address == account2.address)")

// Verify idempotency — concurrent calls return same account
async let a1 = cdp.solana.getOrCreateAccount(name: "Account")
async let a2 = cdp.solana.getOrCreateAccount(name: "Account")
async let a3 = cdp.solana.getOrCreateAccount(name: "Account")

let results = try await [a1, a2, a3]
for (i, r) in results.enumerated() {
    print("Solana Account Address \(i + 1): \(r.address)")
}
