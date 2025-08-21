use thiserror::Error;

#[derive(Error, Debug)]
pub enum CdpError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Authentication error: {0}")]
    Auth(String),
}
