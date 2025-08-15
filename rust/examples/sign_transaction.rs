use std::env;

use cdp_sdk::{CdpClient, CdpClientOptions};
use openapi_client::models::SignEvmTransactionRequest;

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

    // Example EVM account address (replace with actual address)
    let account_address = "0x1234567890123456789012345678901234567890".to_string();

    // Example RLP-encoded transaction (replace with actual transaction)
    let rlp_transaction = "0x02f86b0180843b9aca0082520894d8da6bf26964af9d7eed9e03e53415d37aa96045880de0b6b3a764000080c001a0b7f8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8a0b7f8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8e8c8";

    // Create the transaction request
    // The new simplified API only requires business logic parameters
    // Auth headers (x_wallet_auth, x_idempotency_key) are handled automatically by middleware
    let sign_request = SignEvmTransactionRequest {
        transaction: rlp_transaction.to_string(),
    };

    // Use the EVM API to sign the transaction
    // The simplified API takes only the essential parameters
    match client.evm().sign_transaction(account_address, sign_request).await {
        Ok(response) => {
            println!("✅ Transaction signed successfully!");
            println!("   Signature: {:?}", response.signed_transaction);
        }
        Err(e) => {
            eprintln!("❌ Failed to sign transaction: {}", e);
            return Err(e.into());
        }
    }

    println!("\n🎉 Example completed!");
    println!("\nNote: This example demonstrates the new simplified API where:");
    println!("- Only essential business logic parameters are required");
    println!("- Authentication headers are handled automatically by middleware");
    println!("- No need to manually construct parameter structs with auth details");

    Ok(())
}
