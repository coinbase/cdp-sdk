package com.coinbase.cdp.utils;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.rlp.RlpEncoder;
import org.web3j.rlp.RlpList;
import org.web3j.rlp.RlpString;
import org.web3j.utils.Numeric;

/**
 * Utility for building and encoding EVM transactions.
 *
 * <p>Provides methods for building RLP-encoded EIP-1559 transactions for native ETH transfers and
 * ERC20 token transfers. The CDP API will automatically populate nonce, gas parameters, and chain
 * ID.
 */
public final class TransactionBuilder {

  private TransactionBuilder() {}

  /**
   * Builds an RLP-encoded unsigned EIP-1559 transaction for a native ETH transfer.
   *
   * @param to recipient address (0x-prefixed hex string)
   * @param value amount in wei
   * @return 0x-prefixed hex string of the RLP-encoded transaction
   */
  public static String buildNativeTransfer(String to, BigInteger value) {
    return buildEip1559Transaction(to, value, "0x");
  }

  /**
   * Builds an RLP-encoded unsigned EIP-1559 transaction for an ERC20 transfer.
   *
   * @param tokenAddress the ERC20 token contract address
   * @param to recipient address
   * @param amount amount in the token's smallest unit
   * @return 0x-prefixed hex string of the RLP-encoded transaction
   */
  public static String buildErc20Transfer(String tokenAddress, String to, BigInteger amount) {
    String data = encodeErc20Transfer(to, amount);
    return buildEip1559Transaction(tokenAddress, BigInteger.ZERO, data);
  }

  /**
   * Encodes an ERC20 transfer function call.
   *
   * @param to recipient address
   * @param amount amount to transfer
   * @return 0x-prefixed hex string of the encoded function call
   */
  public static String encodeErc20Transfer(String to, BigInteger amount) {
    Function function =
        new Function(
            "transfer",
            Arrays.asList(new Address(to), new Uint256(amount)),
            Collections.emptyList());
    return FunctionEncoder.encode(function);
  }

  /**
   * Builds an RLP-encoded unsigned EIP-1559 transaction.
   *
   * <p>The transaction is encoded with placeholder values for nonce, gas parameters, and chain ID.
   * The CDP API will populate these fields automatically when the transaction is sent.
   *
   * @param to recipient address (0x-prefixed hex string)
   * @param value ETH value in wei
   * @param data transaction data (0x for simple transfers, or encoded function call)
   * @return 0x-prefixed hex string of the RLP-encoded transaction
   */
  private static String buildEip1559Transaction(String to, BigInteger value, String data) {
    // EIP-1559 transaction fields (type 0x02):
    // [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList]
    //
    // CDP API will populate: nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, chainId
    RlpList rlpList =
        new RlpList(
            RlpString.create(BigInteger.ONE), // chainId (placeholder, CDP will override)
            RlpString.create(BigInteger.ZERO), // nonce (CDP will populate)
            RlpString.create(BigInteger.ZERO), // maxPriorityFeePerGas (CDP will populate)
            RlpString.create(BigInteger.ZERO), // maxFeePerGas (CDP will populate)
            RlpString.create(BigInteger.ZERO), // gasLimit (CDP will populate)
            RlpString.create(Numeric.hexStringToByteArray(to)), // to
            RlpString.create(value), // value
            RlpString.create(Numeric.hexStringToByteArray(data)), // data
            new RlpList() // accessList (empty)
            );

    byte[] encoded = RlpEncoder.encode(rlpList);

    // Prepend EIP-1559 type byte (0x02)
    byte[] typedTransaction = new byte[encoded.length + 1];
    typedTransaction[0] = 0x02;
    System.arraycopy(encoded, 0, typedTransaction, 1, encoded.length);

    return Numeric.toHexString(typedTransaction);
  }
}
