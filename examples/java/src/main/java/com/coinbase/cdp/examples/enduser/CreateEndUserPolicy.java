package com.coinbase.cdp.examples.enduser;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.examples.utils.EnvLoader;
import com.coinbase.cdp.openapi.model.CreatePolicyRequest;
import com.coinbase.cdp.openapi.model.Rule;
import com.coinbase.cdp.openapi.model.SendEndUserEvmTransactionCriteria;
import com.coinbase.cdp.openapi.model.SendEndUserEvmTransactionRule;
import com.coinbase.cdp.openapi.model.SendEndUserSolTransactionCriteria;
import com.coinbase.cdp.openapi.model.SendEndUserSolTransactionRule;
import com.coinbase.cdp.openapi.model.SignEndUserEvmMessageCriteria;
import com.coinbase.cdp.openapi.model.SignEndUserEvmMessageRule;
import com.coinbase.cdp.openapi.model.SignEndUserEvmTransactionCriteria;
import com.coinbase.cdp.openapi.model.SignEndUserEvmTransactionRule;
import com.coinbase.cdp.openapi.model.SignEndUserEvmTypedDataCriteria;
import com.coinbase.cdp.openapi.model.SignEndUserEvmTypedDataRule;
import com.coinbase.cdp.openapi.model.SignEndUserSolMessageCriteria;
import com.coinbase.cdp.openapi.model.SignEndUserSolMessageRule;
import com.coinbase.cdp.openapi.model.SignEndUserSolTransactionCriteria;
import com.coinbase.cdp.openapi.model.SignEndUserSolTransactionRule;
import java.util.List;

/**
 * Example: Create a comprehensive end-user policy with all 7 rule types.
 *
 * <p>This example demonstrates how to create a project-scoped policy that covers all end-user
 * delegated operations across EVM and Solana chains.
 *
 * <p>The policy includes rules for:
 *
 * <ol>
 *   <li>Sign end-user EVM transactions
 *   <li>Send end-user EVM transactions
 *   <li>Sign end-user EVM messages
 *   <li>Sign end-user EVM typed data
 *   <li>Sign end-user Solana transactions
 *   <li>Send end-user Solana transactions
 *   <li>Sign end-user Solana messages
 * </ol>
 *
 * <p>Usage: ./gradlew runCreateEndUserPolicy
 */
public class CreateEndUserPolicy {

  public static void main(String[] args) throws Exception {
    EnvLoader.load();

    try (CdpClient cdp = CdpClient.create()) {
      System.out.println("Creating comprehensive end-user policy...");
      System.out.println();

      // 1. Sign end-user EVM transaction rule
      var signEvmTxRule =
          new SignEndUserEvmTransactionRule()
              .action(SignEndUserEvmTransactionRule.ActionEnum.ACCEPT)
              .operation(
                  SignEndUserEvmTransactionRule.OperationEnum.SIGN_END_USER_EVM_TRANSACTION)
              .criteria(new SignEndUserEvmTransactionCriteria());

      // 2. Send end-user EVM transaction rule
      var sendEvmTxRule =
          new SendEndUserEvmTransactionRule()
              .action(SendEndUserEvmTransactionRule.ActionEnum.ACCEPT)
              .operation(
                  SendEndUserEvmTransactionRule.OperationEnum.SEND_END_USER_EVM_TRANSACTION)
              .criteria(new SendEndUserEvmTransactionCriteria());

      // 3. Sign end-user EVM message rule
      var signEvmMsgRule =
          new SignEndUserEvmMessageRule()
              .action(SignEndUserEvmMessageRule.ActionEnum.ACCEPT)
              .operation(
                  SignEndUserEvmMessageRule.OperationEnum.SIGN_END_USER_EVM_MESSAGE)
              .criteria(new SignEndUserEvmMessageCriteria());

      // 4. Sign end-user EVM typed data rule
      var signEvmTypedDataRule =
          new SignEndUserEvmTypedDataRule()
              .action(SignEndUserEvmTypedDataRule.ActionEnum.ACCEPT)
              .operation(
                  SignEndUserEvmTypedDataRule.OperationEnum.SIGN_END_USER_EVM_TYPED_DATA)
              .criteria(new SignEndUserEvmTypedDataCriteria());

      // 5. Sign end-user Solana transaction rule
      var signSolTxRule =
          new SignEndUserSolTransactionRule()
              .action(SignEndUserSolTransactionRule.ActionEnum.ACCEPT)
              .operation(
                  SignEndUserSolTransactionRule.OperationEnum
                      .SIGN_END_USER_SOL_TRANSACTION)
              .criteria(new SignEndUserSolTransactionCriteria());

      // 6. Send end-user Solana transaction rule
      var sendSolTxRule =
          new SendEndUserSolTransactionRule()
              .action(SendEndUserSolTransactionRule.ActionEnum.ACCEPT)
              .operation(
                  SendEndUserSolTransactionRule.OperationEnum
                      .SEND_END_USER_SOL_TRANSACTION)
              .criteria(new SendEndUserSolTransactionCriteria());

      // 7. Sign end-user Solana message rule
      var signSolMsgRule =
          new SignEndUserSolMessageRule()
              .action(SignEndUserSolMessageRule.ActionEnum.ACCEPT)
              .operation(
                  SignEndUserSolMessageRule.OperationEnum.SIGN_END_USER_SOL_MESSAGE)
              .criteria(new SignEndUserSolMessageCriteria());

      // Create the policy with all 7 rules
      var policy =
          cdp.policies()
              .createPolicy(
                  new CreatePolicyRequest()
                      .scope(CreatePolicyRequest.ScopeEnum.PROJECT)
                      .description("End user delegated operations policy")
                      .rules(
                          List.of(
                              new Rule(signEvmTxRule),
                              new Rule(sendEvmTxRule),
                              new Rule(signEvmMsgRule),
                              new Rule(signEvmTypedDataRule),
                              new Rule(signSolTxRule),
                              new Rule(sendSolTxRule),
                              new Rule(signSolMsgRule))));

      System.out.println("Policy created successfully!");
      System.out.println("  Policy ID: " + policy.getId());
      System.out.println("  Scope: " + policy.getScope());
      System.out.println("  Description: " + policy.getDescription());
      System.out.println("  Rules: " + policy.getRules().size());
    }
  }
}
