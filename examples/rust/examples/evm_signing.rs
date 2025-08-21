use alloy::consensus::SignableTransaction;
use alloy::primitives::{address, hex};
use alloy::{network::TransactionBuilder, primitives::U256, rpc::types::TransactionRequest};
use cdp_sdk::{auth::WalletAuth, types, Client, CDP_BASE_URL};
use dotenv::dotenv;
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Initialize the CDP client
    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, http_client);

    println!("✍️  EVM Signing Example");
    println!("======================\n");

    // First, create an account for signing
    println!("Creating a test account for signing...");
    let create_body =
        types::CreateEvmAccountBody::builder().name(Some("signing-demo-account".parse()?));

    let response = client
        .create_evm_account()
        .x_wallet_auth("")
        .body(create_body)
        .send()
        .await?;

    let account = response.into_inner();
    println!("✅ Created account: {}\n", &*account.address);

    // 1. Sign a hash
    println!("1. Signing a hash...");
    let test_hash = format!("0x{}", "deadbeef".repeat(16)); // 64-character hex string
    let hash_body = types::SignEvmHashBody::builder().hash(test_hash);

    let hash_response = client
        .sign_evm_hash()
        .address(&*account.address)
        .x_wallet_auth("")
        .body(hash_body)
        .send()
        .await?;

    let hash_result = hash_response.into_inner();
    println!("✅ Hash signature: {}...", &hash_result.signature[..50]);

    // 2. Sign a message
    println!("\n2. Signing a message...");
    let message_body = types::SignEvmMessageBody::builder()
        .message("Hello, Coinbase Developer Platform!".to_string());

    let message_response = client
        .sign_evm_message()
        .address(&*account.address)
        .x_wallet_auth("")
        .body(message_body)
        .send()
        .await?;

    let message_result = message_response.into_inner();
    println!(
        "✅ Message signature: {}...",
        &message_result.signature[..50]
    );

    // 3. Sign a transaction
    println!("\n3. Signing a transaction...");

    // Create a sample EIP-1559 transaction (Base Sepolia testnet)
    let tx = TransactionRequest::default()
        .with_to(address!("0000000000000000000000000000000000000000")) // Null address
        .with_nonce(0)
        .with_chain_id(84532) // Base Sepolia
        .with_value(U256::from(1000000000000000u64)) // 0.001 ETH
        .with_gas_limit(21_000)
        .with_max_fee_per_gas(20_000_000_000) // 20 gwei
        .with_max_priority_fee_per_gas(1_000_000_000) // 1 gwei tip
        .build_typed_tx()
        .map_err(|_e| "Failed to build transaction")?;

    // Encode transaction for signing
    let mut buffer = Vec::new();
    tx.encode_for_signing(&mut buffer);
    let hex_encoded = hex::encode(&buffer);

    let tx_body =
        types::SignEvmTransactionBody::builder().transaction(format!("0x{}", hex_encoded));

    let tx_response = client
        .sign_evm_transaction()
        .address(&*account.address)
        .x_wallet_auth("")
        .body(tx_body)
        .send()
        .await?;

    let tx_result = tx_response.into_inner();
    println!("✅ Transaction signed successfully!");
    println!("   Signed tx: {}...", &tx_result.signed_transaction[..50]);

    println!("\n🎉 EVM Signing Complete!");
    println!("\n💡 Note: In a real application, you would broadcast the signed transaction to the network.");
    Ok(())
}
