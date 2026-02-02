package com.coinbase.cdp.utils;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.p2p.solanaj.core.Account;
import org.p2p.solanaj.core.AccountMeta;
import org.p2p.solanaj.core.Message;
import org.p2p.solanaj.core.PublicKey;
import org.p2p.solanaj.core.Transaction;
import org.p2p.solanaj.core.TransactionInstruction;
import org.p2p.solanaj.programs.SystemProgram;
import org.p2p.solanaj.rpc.RpcClient;
import org.p2p.solanaj.rpc.RpcException;

/**
 * Utility for building Solana transactions.
 *
 * <p>Provides methods to build base64-encoded transactions for native SOL transfers and SPL token
 * transfers. Transactions are built as message bytes with empty signatures, as the CDP API handles
 * signing.
 */
public final class SolanaTransactionBuilder {

  /** SPL Token Program ID. */
  public static final PublicKey TOKEN_PROGRAM_ID =
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

  /** Associated Token Account Program ID. */
  public static final PublicKey ASSOCIATED_TOKEN_PROGRAM_ID =
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

  /** System Program ID. */
  public static final PublicKey SYSTEM_PROGRAM_ID =
      new PublicKey("11111111111111111111111111111111");

  /** Rent Sysvar ID. */
  public static final PublicKey SYSVAR_RENT_PUBKEY =
      new PublicKey("SysvarRent111111111111111111111111111111111");

  private SolanaTransactionBuilder() {}

  /**
   * Builds a native SOL transfer transaction.
   *
   * @param rpcClient the Solana RPC client for fetching blockhash
   * @param from the sender public key
   * @param to the recipient public key
   * @param lamports the amount in lamports
   * @return base64-encoded transaction (message with signature placeholders)
   * @throws RpcException if RPC call fails
   */
  public static String buildNativeTransfer(
      RpcClient rpcClient, PublicKey from, PublicKey to, BigInteger lamports) throws RpcException {

    // Use SolanaJ's built-in SystemProgram.transfer which handles AccountMeta correctly
    TransactionInstruction transferIx = SystemProgram.transfer(from, to, lamports.longValue());

    // Build transaction
    Transaction transaction = new Transaction();
    transaction.addInstruction(transferIx);

    // Get latest blockhash
    String recentBlockhash = rpcClient.getApi().getLatestBlockhash();
    transaction.setRecentBlockHash(recentBlockhash);

    // Serialize the message and construct unsigned transaction
    return serializeUnsignedTransaction(transaction, from, 1);
  }

  /**
   * Builds an SPL token transfer transaction.
   *
   * <p>Automatically creates the destination associated token account if it doesn't exist.
   *
   * @param rpcClient the Solana RPC client
   * @param from the sender public key
   * @param to the recipient public key
   * @param mintAddress the token mint address
   * @param amount the amount in token's smallest unit
   * @param decimals the token decimals
   * @return base64-encoded transaction
   * @throws RpcException if RPC call fails
   */
  public static String buildSplTokenTransfer(
      RpcClient rpcClient,
      PublicKey from,
      PublicKey to,
      PublicKey mintAddress,
      BigInteger amount,
      int decimals)
      throws RpcException {

    Transaction transaction = new Transaction();

    // Calculate Associated Token Addresses
    PublicKey sourceAta = getAssociatedTokenAddress(mintAddress, from);
    PublicKey destAta = getAssociatedTokenAddress(mintAddress, to);

    // Check if destination ATA exists, if not add create instruction
    if (!accountExists(rpcClient, destAta)) {
      TransactionInstruction createAtaIx =
          createAssociatedTokenAccountInstruction(from, destAta, to, mintAddress);
      transaction.addInstruction(createAtaIx);
    }

    // Add transferChecked instruction
    TransactionInstruction transferIx =
        createTransferCheckedInstruction(
            sourceAta, mintAddress, destAta, from, amount.longValue(), decimals);
    transaction.addInstruction(transferIx);

    // Get latest blockhash
    String recentBlockhash = rpcClient.getApi().getLatestBlockhash();
    transaction.setRecentBlockHash(recentBlockhash);

    // Serialize the message and construct unsigned transaction
    return serializeUnsignedTransaction(transaction, from, 1);
  }

  /**
   * Serializes a transaction without signing it.
   *
   * <p>Accesses the internal Message object via reflection to serialize the message, then
   * constructs a transaction format with empty signature placeholders.
   *
   * @param transaction the transaction to serialize
   * @param feePayer the fee payer public key
   * @param numSignatures the number of required signatures
   * @return base64-encoded unsigned transaction
   */
  private static String serializeUnsignedTransaction(
      Transaction transaction, PublicKey feePayer, int numSignatures) {
    try {
      // Access the internal message field via reflection
      Field messageField = Transaction.class.getDeclaredField("message");
      messageField.setAccessible(true);
      Message message = (Message) messageField.get(transaction);

      // Set the fee payer on the message using reflection
      // The Message.setFeePayer method is protected and requires an Account
      // We need to create a mock Account with just the public key
      Account mockAccount = createMockAccount(feePayer);

      Method setFeePayerMethod = Message.class.getDeclaredMethod("setFeePayer", Account.class);
      setFeePayerMethod.setAccessible(true);
      setFeePayerMethod.invoke(message, mockAccount);

      // Serialize the message
      byte[] messageBytes = message.serialize();

      // Create transaction format: num_signatures (compact-u16) + empty signatures + message
      // For 1-127 signatures, compact-u16 is just 1 byte
      int signatureSlotSize = 64 * numSignatures;
      byte[] serialized = new byte[1 + signatureSlotSize + messageBytes.length];

      // Number of signatures (compact-u16 format, for small numbers it's just the value)
      serialized[0] = (byte) numSignatures;

      // Signature slots remain zeroed (empty signatures)
      // The CDP API will fill these in

      // Copy message bytes after signature slots
      System.arraycopy(messageBytes, 0, serialized, 1 + signatureSlotSize, messageBytes.length);

      return Base64.getEncoder().encodeToString(serialized);
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize unsigned transaction", e);
    }
  }

  /**
   * Creates a mock Account object with a specific public key for fee payer purposes.
   *
   * <p>Creates a keypair where the public key portion matches the desired public key. The secret
   * key portion is a dummy value since we won't actually sign with this account.
   *
   * @param publicKey the public key
   * @return a mock Account
   */
  private static Account createMockAccount(PublicKey publicKey) {
    try {
      // SolanaJ Account stores a TweetNaclFast.Signature.KeyPair
      // The keyPair constructor takes a 64-byte secret key where:
      // - First 32 bytes: the actual secret key
      // - Last 32 bytes: the public key
      // We'll create a dummy secret key and append the real public key

      byte[] publicKeyBytes = publicKey.toByteArray();
      byte[] dummySecretKey = new byte[64];
      // First 32 bytes are dummy secret key (doesn't matter, we won't sign)
      // Last 32 bytes are the public key
      System.arraycopy(publicKeyBytes, 0, dummySecretKey, 32, 32);

      // Create account from this composite secret key
      return new Account(dummySecretKey);
    } catch (Exception e) {
      throw new RuntimeException("Failed to create mock account", e);
    }
  }

  /**
   * Derives the associated token address for a wallet and mint.
   *
   * @param mint the token mint address
   * @param owner the wallet owner address
   * @return the associated token address
   */
  public static PublicKey getAssociatedTokenAddress(PublicKey mint, PublicKey owner) {
    return PublicKey.findProgramAddress(
            List.of(owner.toByteArray(), TOKEN_PROGRAM_ID.toByteArray(), mint.toByteArray()),
            ASSOCIATED_TOKEN_PROGRAM_ID)
        .getAddress();
  }

  /**
   * Checks if an account exists on-chain.
   *
   * @param rpcClient the RPC client
   * @param address the account address
   * @return true if account exists
   */
  private static boolean accountExists(RpcClient rpcClient, PublicKey address) {
    try {
      var accountInfo = rpcClient.getApi().getAccountInfo(address);
      return accountInfo != null && accountInfo.getValue() != null;
    } catch (RpcException e) {
      return false;
    }
  }

  /**
   * Creates an instruction to create an associated token account.
   *
   * @param payer the account paying for creation
   * @param associatedToken the ATA address to create
   * @param owner the wallet owner
   * @param mint the token mint
   * @return the create ATA instruction
   */
  private static TransactionInstruction createAssociatedTokenAccountInstruction(
      PublicKey payer, PublicKey associatedToken, PublicKey owner, PublicKey mint) {

    List<AccountMeta> keys = new ArrayList<>();

    // 0. Payer (signer, writable)
    keys.add(new AccountMeta(payer, true, true));
    // 1. Associated token account (writable)
    keys.add(new AccountMeta(associatedToken, false, true));
    // 2. Wallet owner
    keys.add(new AccountMeta(owner, false, false));
    // 3. Token mint
    keys.add(new AccountMeta(mint, false, false));
    // 4. System program
    keys.add(new AccountMeta(SYSTEM_PROGRAM_ID, false, false));
    // 5. Token program
    keys.add(new AccountMeta(TOKEN_PROGRAM_ID, false, false));

    // Create instruction with empty data (instruction index 0 for create)
    return new TransactionInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, keys, new byte[0]);
  }

  /**
   * Creates a transferChecked instruction for SPL tokens.
   *
   * @param source the source token account
   * @param mint the token mint
   * @param destination the destination token account
   * @param owner the source account owner
   * @param amount the amount to transfer
   * @param decimals the token decimals
   * @return the transfer instruction
   */
  private static TransactionInstruction createTransferCheckedInstruction(
      PublicKey source,
      PublicKey mint,
      PublicKey destination,
      PublicKey owner,
      long amount,
      int decimals) {

    List<AccountMeta> keys = new ArrayList<>();

    // 0. Source token account (writable)
    keys.add(new AccountMeta(source, false, true));
    // 1. Token mint
    keys.add(new AccountMeta(mint, false, false));
    // 2. Destination token account (writable)
    keys.add(new AccountMeta(destination, false, true));
    // 3. Owner/authority (signer)
    keys.add(new AccountMeta(owner, true, false));

    // Instruction data: [12 (TransferChecked), amount (8 bytes LE), decimals (1 byte)]
    byte[] data = new byte[10];
    data[0] = 12; // TransferChecked instruction index

    // Amount as little-endian u64
    for (int i = 0; i < 8; i++) {
      data[1 + i] = (byte) ((amount >> (i * 8)) & 0xFF);
    }

    // Decimals
    data[9] = (byte) decimals;

    return new TransactionInstruction(TOKEN_PROGRAM_ID, keys, data);
  }
}
