use thiserror::Error;

#[derive(Error, Debug)]
pub enum CdpError {
    #[error("HTTP client error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Middleware error: {0}")]
    Middleware(#[from] reqwest_middleware::Error),

    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("URL parsing error: {0}")]
    UrlParse(#[from] url::ParseError),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("API error: {0}")]
    Api(String),
}

impl<T> From<crate::apis::Error<T>> for CdpError
where
    T: std::fmt::Debug
{
    fn from(error: crate::apis::Error<T>) -> Self {
        match error {
            crate::apis::Error::Reqwest(e) => CdpError::Http(e),
            crate::apis::Error::ReqwestMiddleware(e) => CdpError::Middleware(e),
            crate::apis::Error::Serde(e) => CdpError::Json(e),
            crate::apis::Error::Io(e) => CdpError::Api(e.to_string()),
            crate::apis::Error::ResponseError(content) => {
                CdpError::Api(format!("HTTP {}: {}", content.status, content.content))
            }
        }
    }
}

pub type Result<T> = std::result::Result<T, CdpError>;
