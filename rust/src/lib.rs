#![allow(clippy::doc_lazy_continuation)]
#![allow(clippy::doc_overindented_list_items)]

include!("./api.rs");

pub mod api;
pub mod auth;
pub mod error;

/// The default base URL for the Coinbase Developer Platform API
pub const CDP_BASE_URL: &str = "https://api.cdp.coinbase.com/platform";
