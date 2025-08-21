use base64::Engine;
use cdp_sdk::{auth::WalletAuth, types, Client, CDP_BASE_URL};
use reqwest_middleware::ClientBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the CDP client
    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, http_client);

    println!("✍️  Solana Signing Example");
    println!("=========================\n");

    // First, create a Solana account for signing
    println!("Creating a test Solana account for signing...");
    let create_body =
        types::CreateSolanaAccountBody::builder().name(Some("solana-signing-demo".parse()?));

    let response = client
        .create_solana_account()
        .x_wallet_auth("")
        .body(create_body)
        .send()
        .await?;

    let account = response.into_inner();
    println!("✅ Created Solana account: {}\n", &*account.address);

    // 1. Sign a message
    println!("1. Signing a message...");
    let message = "Hello from Solana! 🌞";
    let encoded_message = base64::engine::general_purpose::STANDARD.encode(message.as_bytes());

    let message_body = types::SignSolanaMessageBody::builder().message(encoded_message);

    let message_response = client
        .sign_solana_message()
        .address(&*account.address)
        .x_wallet_auth("")
        .body(message_body)
        .send()
        .await?;

    let message_result = message_response.into_inner();
    println!("✅ Message signed successfully!");
    println!("   Original message: \"{}\"", message);
    println!("   Signature: {}...", &message_result.signature[..50]);

    // 2. Sign a transaction
    println!("\n2. Signing a transaction...");

    // Decode the account's public key for use in the transaction
    let account_pubkey = bs58::decode(&*account.address)
        .into_vec()
        .map_err(|e| format!("Failed to decode Solana address: {}", e))?;

    if account_pubkey.len() != 32 {
        return Err(format!("Invalid Solana public key length: {}", account_pubkey.len()).into());
    }

    // Create a minimal valid Solana transaction structure
    let unsigned_tx_bytes = vec![
        0, // Number of signatures (0 for unsigned)
        1, // Number of required signatures
        0, // Number of read-only signed accounts
        0, // Number of read-only unsigned accounts
        1, // Number of account keys
    ];

    // Build the complete transaction
    let mut tx_bytes = unsigned_tx_bytes;
    tx_bytes.extend_from_slice(&account_pubkey); // Account public key
    tx_bytes.extend_from_slice(&[1u8; 32]); // Recent blockhash (placeholder)
    tx_bytes.extend_from_slice(&[
        1, // Number of instructions
        0, // Program ID index
        1, // Number of accounts in instruction
        0, // Account index
        4, // Data length
        1, 2, 3, 4, // Instruction data (placeholder)
    ]);

    let base64_tx = base64::engine::general_purpose::STANDARD.encode(&tx_bytes);

    let tx_body = types::SignSolanaTransactionBody::builder().transaction(base64_tx);

    let tx_response = client
        .sign_solana_transaction()
        .address(&*account.address)
        .x_wallet_auth("")
        .body(tx_body)
        .send()
        .await?;

    let tx_result = tx_response.into_inner();
    println!("✅ Transaction signed successfully!");
    println!(
        "   Signed transaction: {}...",
        &tx_result.signed_transaction[..50]
    );

    println!("\n🎉 Solana Signing Complete!");
    println!("\n💡 Note: In a real application, you would:");
    println!("   • Create actual program instructions");
    println!("   • Use real recent blockhashes");
    println!("   • Submit the signed transaction to the Solana network");
    Ok(())
}
