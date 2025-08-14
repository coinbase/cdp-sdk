use crate::error::{CdpError, Result};
use base64::Engine;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::{Request, Response};
use reqwest_middleware::{Middleware, Next};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,
    iss: String,
    aud: Vec<String>,
    exp: u64,
    iat: u64,
    jti: String,
    uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WalletClaims {
    sub: String,
    iss: String,
    aud: Vec<String>,
    exp: u64,
    iat: u64,
    jti: String,
    uris: Vec<String>,
    digest: String,
}

#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub api_key_id: String,
    pub api_key_secret: String,
    pub wallet_secret: Option<String>,
    pub source: Option<String>,
    pub source_version: Option<String>,
    pub expires_in: Option<u64>,
    pub debug: bool,
}

pub struct AuthMiddleware {
    config: AuthConfig,
}

impl AuthMiddleware {
    pub fn new(config: AuthConfig) -> Self {
        Self { config }
    }

    fn generate_jwt(
        &self,
        method: &str,
        host: &str,
        path: &str,
        expires_in: u64,
    ) -> Result<String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let claims = Claims {
            sub: self.config.api_key_id.clone(),
            iss: "cdp".to_string(),
            aud: vec!["cdp_service".to_string()],
            exp: now + expires_in,
            iat: now,
            jti: Uuid::new_v4().to_string(),
            uri: format!("{} {}{}", method, host, path)
        };

        let header = Header::new(Algorithm::ES256);

        // Parse the API key secret (assuming it's base64 encoded for Ed25519)
        let key_bytes = if self.config.api_key_secret.starts_with("-----BEGIN") {
            // PEM format
            self.config.api_key_secret.as_bytes().to_vec()
        } else {
            // Base64 format
            base64::engine::general_purpose::STANDARD
                .decode(&self.config.api_key_secret)
                .map_err(|_| CdpError::Auth("Invalid API key secret format".to_string()))?
        };

        let encoding_key = EncodingKey::from_ec_pem(&key_bytes)
            .or_else(|_| EncodingKey::from_ed_pem(&key_bytes))
            .map_err(|_| CdpError::Auth("Failed to parse API key secret".to_string()))?;

        encode(&header, &claims, &encoding_key).map_err(CdpError::from)
    }

    fn generate_wallet_jwt(
        &self,
        method: &str,
        host: &str,
        path: &str,
        body: &[u8],
    ) -> Result<String> {
        let wallet_secret = self.config.wallet_secret.as_ref()
            .ok_or_else(|| CdpError::Auth("Wallet secret required for this operation".to_string()))?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Create digest of the request body
        let mut hasher = Sha256::new();
        hasher.update(body);
        let digest = format!("sha256={}", base64::engine::general_purpose::STANDARD.encode(hasher.finalize()));

        let claims = WalletClaims {
            sub: self.config.api_key_id.clone(),
            iss: "cdp".to_string(),
            aud: vec!["cdp_service".to_string()],
            exp: now + 120, // 2 minutes
            iat: now,
            jti: Uuid::new_v4().to_string(),
            uris: vec![format!("{} {}{}", method, host, path)],
            digest,
        };

        let header = Header::new(Algorithm::ES256);

        // Parse the wallet secret
        let key_bytes = if wallet_secret.starts_with("-----BEGIN") {
            wallet_secret.as_bytes().to_vec()
        } else {
            base64::engine::general_purpose::STANDARD
                .decode(wallet_secret)
                .map_err(|_| CdpError::Auth("Invalid wallet secret format".to_string()))?
        };

        let encoding_key = EncodingKey::from_ec_pem(&key_bytes)
            .or_else(|_| EncodingKey::from_ed_pem(&key_bytes))
            .map_err(|_| CdpError::Auth("Failed to parse wallet secret".to_string()))?;

        encode(&header, &claims, &encoding_key).map_err(CdpError::from)
    }

    fn requires_wallet_auth(&self, method: &str, path: &str) -> bool {
        (path.contains("/accounts") || path.contains("/spend-permissions")) &&
        (method == "POST" || method == "DELETE" || method == "PUT")
    }

    fn get_correlation_data(&self) -> String {
        let mut data = HashMap::new();
        data.insert("sdk_version".to_string(), "0.1.0".to_string());
        data.insert("sdk_language".to_string(), "rust".to_string());
        data.insert("source".to_string(),
                   self.config.source.clone().unwrap_or_else(|| "sdk-auth".to_string()));

        if let Some(ref source_version) = self.config.source_version {
            data.insert("source_version".to_string(), source_version.clone());
        }

        data.into_iter()
            .map(|(k, v)| format!("{}={}", k, urlencoding::encode(&v)))
            .collect::<Vec<_>>()
            .join(",")
    }
}

#[async_trait::async_trait]
impl Middleware for AuthMiddleware {
    async fn handle(
        &self,
        mut req: Request,
        extensions: &mut http::Extensions,
        next: Next<'_>,
    ) -> reqwest_middleware::Result<Response> {
        let method = req.method().as_str().to_uppercase();
        let url = req.url().clone();
        let host = url.host_str().unwrap_or("api.cdp.coinbase.com");
        let path = url.path();

        // Get request body for wallet auth
        let body = if let Some(body) = req.body() {
            body.as_bytes().unwrap_or_default().to_vec()
        } else {
            Vec::new()
        };

        let expires_in = self.config.expires_in.unwrap_or(120);

        // Generate main JWT
        let jwt = self.generate_jwt(&method, host, path, expires_in)
            .map_err(reqwest_middleware::Error::middleware)?;

        // Add authorization header
        req.headers_mut().insert(
            "Authorization",
            format!("Bearer {}", jwt).parse().unwrap(),
        );

        // Add content type
        req.headers_mut().insert(
            "Content-Type",
            "application/json".parse().unwrap(),
        );

        // Add wallet auth if needed
        if self.requires_wallet_auth(&method, path) {
            let wallet_jwt = self.generate_wallet_jwt(&method, host, path, &body)
                .map_err(reqwest_middleware::Error::middleware)?;

            req.headers_mut().insert(
                "X-Wallet-Auth",
                wallet_jwt.parse().unwrap(),
            );
        }

        // Add correlation data
        req.headers_mut().insert(
            "Correlation-Context",
            self.get_correlation_data().parse().unwrap(),
        );

        if self.config.debug {
            println!("Request: {} {}", method, url);
            println!("Headers: {:?}", req.headers());
        }

        let response = next.run(req, extensions).await;

        if self.config.debug {
            if let Ok(ref resp) = response {
                println!("Response: {} {}", resp.status(), resp.status().canonical_reason().unwrap_or(""));
            }
        }

        response
    }
}
