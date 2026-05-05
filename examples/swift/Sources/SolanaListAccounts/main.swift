// Usage: swift run SolanaListAccounts
// Requires: CDP_API_KEY_ID, CDP_API_KEY_SECRET env vars

import CDPSDK

let cdp = try CdpClient()

var page = try await cdp.solana.listAccounts()

for account in page.accounts {
    print("Account: \(account.address)")
}

while let token = page.nextPageToken {
    page = try await cdp.solana.listAccounts(options: .init(pageToken: token))

    for account in page.accounts {
        print("Account: \(account.address)")
    }
}
