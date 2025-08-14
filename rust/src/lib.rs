mod auth;
mod client;
mod error;
mod evm;
mod solana;
mod policies;

pub use client::{CdpClient, CdpClientOptions};
pub use error::CdpError;

// High-level API modules
pub use evm::EvmApi;
pub use solana::SolanaApi;
pub use policies::PoliciesApi;

// Re-export the openapi client for advanced usage
pub use openapi_client;
