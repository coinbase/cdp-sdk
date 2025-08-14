use cdp_sdk::{CdpClient, CdpClientOptions};
use openapi_client::models::{SignEvmTransactionRequest, CreateEvmAccountRequest, CreateSolanaAccountRequest, SignSolanaTransactionRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the CDP client with configuration
    // You can either set environment variables or pass them as options
    let client = CdpClient::new(CdpClientOptions {
        api_key_id: Some("your-api-key-id".to_string()),
        api_key_secret: Some("your-api-key-secret".to_string()),
        wallet_secret: Some("your-wallet-secret".to_string()),
        ..Default::default()
    })?;

    println!("=== CDP SDK Rust - Simplified API Usage Example ===");
    println!("This example demonstrates the new simplified parameter structure for all APIs\n");

    // ===== EVM API Examples =====
    println!("🔷 EVM API Examples:");

    // 1. List EVM accounts
    match client.evm().list_accounts(Some(10), None).await {
        Ok(accounts) => {
            println!("✅ Listed EVM accounts: {} found", accounts.accounts.len());
        }
        Err(e) => println!("❌ Failed to list EVM accounts: {}", e),
    }

    // 2. Create an EVM account
    let create_evm_request = CreateEvmAccountRequest {
        name: Some("example-evm-account".to_string()),
        account_policy: None,
    };

    match client.evm().create_account(create_evm_request).await {
        Ok(account) => {
            println!("✅ Created EVM account: {}", account.address);

            // 3. Get the account we just created
            match client.evm().get_account(account.address.clone()).await {
                Ok(fetched_account) => {
                    println!("✅ Retrieved EVM account: {}", fetched_account.address);
                }
                Err(e) => println!("❌ Failed to get EVM account: {}", e),
            }

            // 4. Sign a transaction with the created account
            let rlp_transaction = "0x02f86b0180843b9aca0082520894d8da6bf26964af9d7eed9e03e53415d37aa96045880de0b6b3a764000080c001a0b7f8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8a0b7f8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8";

            let sign_request = SignEvmTransactionRequest {
                transaction: rlp_transaction.to_string(),
            };

            match client.evm().sign_transaction(account.address.clone(), sign_request).await {
                Ok(response) => {
                    println!("✅ Transaction signed successfully!");
                    println!("   Signature: {:?}", response.signed_transaction);
                }
                Err(e) => println!("❌ Failed to sign transaction: {}", e),
            }
        }
        Err(e) => println!("❌ Failed to create EVM account: {}", e),
    }

    // ===== Solana API Examples =====
    println!("\n🔶 Solana API Examples:");

    // 1. List Solana accounts
    match client.solana().list_accounts(Some(10), None).await {
        Ok(accounts) => {
            println!("✅ Listed Solana accounts: {} found", accounts.accounts.len());
        }
        Err(e) => println!("❌ Failed to list Solana accounts: {}", e),
    }

    // 2. Create a Solana account
    let create_solana_request = CreateSolanaAccountRequest {
        name: Some("example-solana-account".to_string()),
        account_policy: None,
    };

    match client.solana().create_account(create_solana_request).await {
        Ok(account) => {
            println!("✅ Created Solana account: {}", account.address);

            // 3. Get the account we just created
            match client.solana().get_account(account.address.clone()).await {
                Ok(fetched_account) => {
                    println!("✅ Retrieved Solana account: {}", fetched_account.address);
                }
                Err(e) => println!("❌ Failed to get Solana account: {}", e),
            }

            // 4. Sign a transaction with the created account (example)
            let serialized_transaction = "example_serialized_transaction_base64_string";

            let sign_request = SignSolanaTransactionRequest {
                transaction: serialized_transaction.to_string(),
            };

            match client.solana().sign_transaction(account.address.clone(), sign_request).await {
                Ok(response) => {
                    println!("✅ Solana transaction signed successfully!");
                    println!("   Signature: {:?}", response.signed_transaction);
                }
                Err(e) => println!("❌ Failed to sign Solana transaction: {}", e),
            }
        }
        Err(e) => println!("❌ Failed to create Solana account: {}", e),
    }

    // ===== Policies API Examples =====
    println!("\n🔸 Policies API Examples:");

    // 1. List policies
    match client.policies().list_policies(Some(10), None, None).await {
        Ok(policies) => {
            println!("✅ Listed policies: {} found", policies.policies.len());

            // If we have policies, let's get one by ID
            if let Some(first_policy) = policies.policies.first() {
                match client.policies().get_policy(first_policy.id.clone()).await {
                    Ok(policy) => {
                        println!("✅ Retrieved policy: {}", policy.id);
                    }
                    Err(e) => println!("❌ Failed to get policy: {}", e),
                }
            }
        }
        Err(e) => println!("❌ Failed to list policies: {}", e),
    }

    println!("\n🎉 Example completed!");
    println!("\nNote: This example demonstrates the new simplified API where:");
    println!("- Only essential business logic parameters are required");
    println!("- Authentication headers (x_wallet_auth, x_idempotency_key) are handled automatically");
    println!("- No need to manually construct complex parameter structs");
    println!("- Much cleaner and more intuitive API surface");

    Ok(())
}
