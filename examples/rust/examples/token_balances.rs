use cdp_sdk::{auth::WalletAuth, Client, CDP_BASE_URL};
use dotenv::dotenv;
use reqwest_middleware::ClientBuilder;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    // Initialize the CDP client
    let wallet_auth = WalletAuth::builder().build()?;
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(wallet_auth)
        .build();
    let client = Client::new_with_client(CDP_BASE_URL, http_client);

    println!("💰 Token Balances Example");
    println!("=========================\n");

    // EVM Token Balances
    println!("🔷 EVM Token Balances (Base Sepolia)");
    println!("------------------------------------");

    // Skip EVM token balances if environment variable is set
    if env::var("CDP_E2E_SKIP_EVM_TOKEN_BALANCES").unwrap_or_default() == "true" {
        println!("⏭️  Skipping EVM token balances (CDP_E2E_SKIP_EVM_TOKEN_BALANCES=true)");
    } else {
        // Use a known address with token balances for demonstration
        let evm_address = "0x5b76f5B8fc9D700624F78208132f91AD4e61a1f0";

        println!("📊 Querying token balances for address: {}", evm_address);

        let evm_response = client
            .list_evm_token_balances()
            .address(evm_address)
            .network("base-sepolia")
            .page_size(5)
            .send()
            .await?;

        let evm_balances = evm_response.into_inner();
        println!(
            "✅ Found {} EVM token balances:",
            evm_balances.balances.len()
        );

        for (i, balance) in evm_balances.balances.iter().enumerate() {
            let token = &balance.token;
            println!(
                "   {}. {} {}",
                i + 1,
                &*balance.amount.amount,
                token.symbol.as_ref().unwrap_or(&"UNKNOWN".to_string())
            );
            println!("      Contract: {}", &*token.contract_address);
            if let Some(ref name) = token.name {
                println!("      Name: {}", name);
            }
        }

        // Demonstrate pagination if there are more results
        if let Some(ref next_token) = evm_balances.next_page_token {
            println!("\n📄 Getting next page of EVM balances...");
            let next_page_response = client
                .list_evm_token_balances()
                .address(evm_address)
                .network("base-sepolia")
                .page_size(3)
                .page_token(next_token)
                .send()
                .await?;

            let next_page = next_page_response.into_inner();
            println!(
                "✅ Next page contains {} more balances",
                next_page.balances.len()
            );
        }
    }

    println!("\n☀️  Solana Token Balances (Devnet)");
    println!("----------------------------------");

    // Use a known Solana address with token balances
    let solana_address = "4PkiqJkUvxr9P8C1UsMqGN8NJsUcep9GahDRLfmeu8UK";

    println!(
        "📊 Querying Solana token balances for address: {}",
        solana_address
    );

    let solana_response = client
        .list_solana_token_balances()
        .address(solana_address)
        .network("solana-devnet")
        .page_size(5)
        .send()
        .await?;

    let solana_balances = solana_response.into_inner();
    println!(
        "✅ Found {} Solana token balances:",
        solana_balances.balances.len()
    );

    for (i, balance) in solana_balances.balances.iter().enumerate() {
        let token = &balance.token;
        println!(
            "   {}. {} {}",
            i + 1,
            &*balance.amount.amount,
            token.symbol.as_ref().unwrap_or(&"UNKNOWN".to_string())
        );
        println!("      Mint: {}", &*token.mint_address);
        if let Some(ref name) = token.name {
            println!("      Name: {}", name);
        }
    }

    // Demonstrate pagination for Solana if there are more results
    if let Some(ref next_token) = solana_balances.next_page_token {
        println!("\n📄 Getting next page of Solana balances...");
        let next_page_response = client
            .list_solana_token_balances()
            .address(solana_address)
            .network("solana-devnet")
            .page_size(3)
            .page_token(next_token)
            .send()
            .await?;

        let next_page = next_page_response.into_inner();
        println!(
            "✅ Next page contains {} more balances",
            next_page.balances.len()
        );
    }

    println!("\n🎉 Token Balance Queries Complete!");
    println!("\n💡 Use cases for token balance queries:");
    println!("   • Portfolio tracking applications");
    println!("   • DeFi protocol integrations");
    println!("   • Wallet balance displays");
    println!("   • Trading bot decision making");
    println!("   • Tax reporting and accounting");
    Ok(())
}
