package com.coinbase.cdp.examples.solana;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.api.X402FacilitatorApi;
import com.coinbase.cdp.openapi.model.CreateSolanaAccountRequest;
import com.coinbase.cdp.openapi.model.InlineObject;
import com.coinbase.cdp.openapi.model.InlineObject2;
import com.coinbase.cdp.openapi.model.SignSolanaTransaction200Response;
import com.coinbase.cdp.openapi.model.SignSolanaTransactionRequest;
import com.coinbase.cdp.openapi.model.SolanaAccount;
import com.coinbase.cdp.openapi.model.VerifyX402PaymentRequest;
import com.coinbase.cdp.openapi.model.X402ExactSolanaPayload;
import com.coinbase.cdp.openapi.model.X402PaymentPayload;
import com.coinbase.cdp.openapi.model.X402PaymentRequirements;
import com.coinbase.cdp.openapi.model.X402SupportedPaymentKind;
import com.coinbase.cdp.openapi.model.X402V1PaymentPayload;
import com.coinbase.cdp.openapi.model.X402V1PaymentPayloadPayload;
import com.coinbase.cdp.openapi.model.X402V1PaymentRequirements;
import com.coinbase.cdp.openapi.model.X402Version;
import com.coinbase.cdp.utils.SolanaTransactionBuilder;
import java.math.BigInteger;
import org.p2p.solanaj.core.PublicKey;
import org.p2p.solanaj.rpc.RpcClient;

/**
 * Demonstrates the x402 payment flow on Solana using the CDP SDK.
 *
 * <p>x402 is a protocol for HTTP-native payments. The payer constructs and signs a transaction but
 * does NOT broadcast it directly. Instead, the signed transaction is included as a payment payload
 * in HTTP headers. The x402 facilitator verifies and settles the transaction on behalf of the
 * resource provider.
 *
 * <p>This example shows the full flow:
 *
 * <ol>
 *   <li>Query supported x402 payment kinds from the facilitator
 *   <li>Create a CDP-managed Solana account (the payer)
 *   <li>Construct an unsigned SOL transfer transaction via the SDK's SolanaTransactionBuilder
 *   <li>Sign the transaction via CDP (sign-only, no broadcast)
 *   <li>Assemble the x402 payment payload and verify it with the facilitator
 * </ol>
 *
 * <p>Note: This example does not fund the account via faucet. The verify call will likely return
 * invalid due to insufficient funds, but the full API flow is demonstrated. In production, the
 * payer account would be funded before constructing the payment transaction.
 */
public class SignTransactionX402 {

  private static final String SOLANA_DEVNET_RPC = "https://api.devnet.solana.com";

  // Recipient address representing the x402 payee (resource provider or facilitator).
  private static final String PAYEE_ADDRESS = "3KzDtddx4i53FBkvCzuDmRbaMozTZoJBb1TToWhz3JfE";

  // Transfer amount in lamports (0.0001 SOL).
  private static final BigInteger TRANSFER_LAMPORTS = BigInteger.valueOf(100_000);

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {

      // ---------------------------------------------------------------
      // Step 1: Query supported x402 payment kinds
      // ---------------------------------------------------------------
      System.out.println("=== Step 1: Query supported x402 payment kinds ===");
      X402FacilitatorApi x402Api = new X402FacilitatorApi(cdp.getApiClient());
      InlineObject2 supported = x402Api.supportedX402PaymentKinds();

      System.out.println("Supported payment kinds:");
      for (X402SupportedPaymentKind kind : supported.getKinds()) {
        System.out.printf(
            "  - version=%s, scheme=%s, network=%s%n",
            kind.getX402Version(), kind.getScheme(), kind.getNetwork());
      }
      System.out.println("Signer networks: " + supported.getSigners().keySet());
      System.out.println();

      // ---------------------------------------------------------------
      // Step 2: Create a CDP-managed Solana account (the payer)
      // ---------------------------------------------------------------
      System.out.println("=== Step 2: Create a Solana account ===");
      SolanaAccount account =
          cdp.solana().createAccount(new CreateSolanaAccountRequest().name("x402-payer-example"));
      String payerAddress = account.getAddress();
      System.out.println("Payer address: " + payerAddress);
      System.out.println();

      // ---------------------------------------------------------------
      // Step 3: Build an unsigned SOL transfer transaction
      // ---------------------------------------------------------------
      // In an x402 flow, this transaction represents the payment to the
      // resource provider. The amount and recipient would come from the
      // server's 402 Payment Required response (X-Payment header).
      System.out.println("=== Step 3: Build unsigned Solana transfer transaction ===");
      RpcClient rpcClient = new RpcClient(SOLANA_DEVNET_RPC);
      PublicKey fromKey = new PublicKey(payerAddress);
      PublicKey toKey = new PublicKey(PAYEE_ADDRESS);

      String unsignedTxBase64 =
          SolanaTransactionBuilder.buildNativeTransfer(rpcClient, fromKey, toKey, TRANSFER_LAMPORTS);

      System.out.println("Unsigned transaction (base64): " + unsignedTxBase64.substring(0, 40) + "...");
      System.out.println();

      // ---------------------------------------------------------------
      // Step 4: Sign the transaction via CDP (sign-only, no broadcast)
      // ---------------------------------------------------------------
      // The key x402 distinction: we sign but do NOT send. The signed
      // transaction becomes the payment payload that accompanies the
      // HTTP request to the paid resource. The x402 facilitator settles
      // it after verifying the payment.
      System.out.println("=== Step 4: Sign transaction via CDP ===");
      SignSolanaTransaction200Response signResponse =
          cdp.solana()
              .signTransaction(
                  payerAddress,
                  new SignSolanaTransactionRequest().transaction(unsignedTxBase64));

      String signedTxBase64 = signResponse.getSignedTransaction();
      System.out.println("Signed transaction (base64): " + signedTxBase64.substring(0, 40) + "...");
      System.out.println();

      // ---------------------------------------------------------------
      // Step 5: Assemble the x402 payment payload and verify
      // ---------------------------------------------------------------
      // In a real x402 flow:
      //   1. Client requests a paid resource and receives 402 + payment requirements
      //   2. Client constructs and signs the payment transaction (steps 3-4 above)
      //   3. Client retries the request with the signed tx in the X-Payment header
      //   4. The server (resource provider) calls verify/settle via the facilitator
      //
      // Here we call verify directly to demonstrate the facilitator API.
      System.out.println("=== Step 5: Verify x402 payment ===");

      // Wrap the signed transaction in the Solana-specific payload
      X402ExactSolanaPayload solanaPayload =
          new X402ExactSolanaPayload().transaction(signedTxBase64);

      // Build the v1 payment payload
      X402V1PaymentPayload paymentPayload =
          new X402V1PaymentPayload()
              .x402Version(X402Version.NUMBER_1)
              .scheme(X402V1PaymentPayload.SchemeEnum.EXACT)
              .network(X402V1PaymentPayload.NetworkEnum.SOLANA_DEVNET)
              .payload(new X402V1PaymentPayloadPayload(solanaPayload));

      // Build the payment requirements (mirroring what a server would provide)
      X402V1PaymentRequirements paymentRequirements =
          new X402V1PaymentRequirements()
              .scheme(X402V1PaymentRequirements.SchemeEnum.EXACT)
              .network(X402V1PaymentRequirements.NetworkEnum.SOLANA_DEVNET)
              .maxAmountRequired(TRANSFER_LAMPORTS.toString())
              .resource("https://example.com/api/paid-resource")
              .description("Example x402 Solana payment")
              .mimeType("application/json")
              .payTo(PAYEE_ADDRESS)
              .maxTimeoutSeconds(300)
              .asset("sol");

      // Verify the payment with the x402 facilitator
      InlineObject verifyResponse =
          x402Api.verifyX402Payment(
              new VerifyX402PaymentRequest()
                  .x402Version(X402Version.NUMBER_1)
                  .paymentPayload(new X402PaymentPayload(paymentPayload))
                  .paymentRequirements(new X402PaymentRequirements(paymentRequirements)));

      System.out.println("Verification result:");
      System.out.println("  Valid:  " + verifyResponse.getIsValid());
      System.out.println("  Payer:  " + verifyResponse.getPayer());
      if (!verifyResponse.getIsValid()) {
        System.out.println("  Reason: " + verifyResponse.getInvalidReason());
        System.out.println("  Message: " + verifyResponse.getInvalidMessage());
        System.out.println();
        System.out.println(
            "Note: The payment is expected to be invalid in this example because the");
        System.out.println(
            "account was not funded. In production, the payer account would have");
        System.out.println("sufficient SOL before constructing the payment transaction.");
      }
      System.out.println();
      System.out.println("x402 Solana sign transaction example complete.");
    }
  }
}
