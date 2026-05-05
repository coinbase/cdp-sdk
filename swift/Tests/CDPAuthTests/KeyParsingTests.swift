import CDPAuth
import Foundation
import Testing

@Suite("Key Parsing Tests")
struct KeyParsingTests {

    static let testECPemKey = """
        -----BEGIN EC PRIVATE KEY-----
        MHcCAQEEIEt4qyw7G81ez33oGWu/Coxkz8DrPC5tLMaV1Hx28OS8oAoGCCqGSM49
        AwEHoUQDQgAELKkGhad1ltfX1+UQFYybcfKT/h6XsY+TXxcEewnlTXzUWvuEBTh1
        5X6msSbR6OLpn3uwjB72XvYsrKc4dIfjUw==
        -----END EC PRIVATE KEY-----
        """

    // 64 bytes (32 seed + 32 public key) base64 encoded for Ed25519 test
    static let testEd25519Key: String = {
        var bytes = [UInt8](repeating: 0, count: 64)
        // Create deterministic test key data
        for i in 0..<64 {
            bytes[i] = UInt8(i & 0xFF)
        }
        return Data(bytes).base64EncodedString()
    }()

    @Test("Detect EC PEM key format")
    func testIsECPemKey() {
        #expect(isECPemKey(KeyParsingTests.testECPemKey) == true)
        #expect(isECPemKey("not a pem key") == false)
        #expect(isECPemKey("-----BEGIN RSA PRIVATE KEY-----\nfoo\n-----END RSA PRIVATE KEY-----") == false)
    }

    @Test("Detect Ed25519 key format")
    func testIsEd25519Key() {
        #expect(isEd25519Key(KeyParsingTests.testEd25519Key) == true)
        #expect(isEd25519Key("short") == false)
        #expect(isEd25519Key("not-base64!!!") == false)
    }

    @Test("Parse EC PEM key returns ES256 algorithm")
    func testParseECKey() throws {
        let (algorithm, _) = try parseSigningKey(KeyParsingTests.testECPemKey)
        #expect(algorithm == .es256)
    }

    @Test("Parse Ed25519 key returns EdDSA algorithm")
    func testParseEd25519Key() throws {
        let (algorithm, _) = try parseSigningKey(KeyParsingTests.testEd25519Key)
        #expect(algorithm == .edDSA)
    }

    @Test("Parse invalid key throws error")
    func testParseInvalidKey() {
        #expect(throws: AuthError.self) {
            _ = try parseSigningKey("completely-invalid-key-material")
        }
    }

    @Test("EC signer produces 64-byte raw signature")
    func testECSigning() throws {
        let signer = try P256Signer(pemKey: KeyParsingTests.testECPemKey)
        let message = "test message".data(using: .utf8)!
        let signature = try signer.sign(message)
        // P-256 raw signature is r (32 bytes) || s (32 bytes) = 64 bytes
        #expect(signature.count == 64)
    }

    @Test("Ed25519 signer produces 64-byte signature")
    func testEd25519Signing() throws {
        let signer = try Ed25519Signer(base64Key: KeyParsingTests.testEd25519Key)
        let message = "test message".data(using: .utf8)!
        let signature = try signer.sign(message)
        // Ed25519 signature is always 64 bytes
        #expect(signature.count == 64)
    }
}
