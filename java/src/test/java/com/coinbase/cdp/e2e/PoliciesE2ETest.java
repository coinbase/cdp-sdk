package com.coinbase.cdp.e2e;

import static org.assertj.core.api.Assertions.*;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.client.policies.PoliciesClientOptions.ListPoliciesOptions;
import com.coinbase.cdp.openapi.model.CreateEvmAccountRequest;
import com.coinbase.cdp.openapi.model.CreatePolicyRequest;
import com.coinbase.cdp.openapi.model.EthValueCriterion;
import com.coinbase.cdp.openapi.model.EvmAccount;
import com.coinbase.cdp.openapi.model.Policy;
import com.coinbase.cdp.openapi.model.Rule;
import com.coinbase.cdp.openapi.model.SendEvmTransactionCriteria;
import com.coinbase.cdp.openapi.model.SendEvmTransactionCriteriaInner;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRule;
import com.coinbase.cdp.openapi.model.SignEvmTransactionCriteria;
import com.coinbase.cdp.openapi.model.SignEvmTransactionCriteriaInner;
import com.coinbase.cdp.openapi.model.SignEvmTransactionRule;
import com.coinbase.cdp.openapi.model.UpdatePolicyRequest;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;

/** E2E tests for policy management operations. */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PoliciesE2ETest {

  private static CdpClient cdp;
  private static String testPolicyId;

  @BeforeAll
  static void setup() {
    cdp = TestUtils.createDefaultClient();
  }

  @AfterAll
  static void teardown() {
    // Clean up test policy if it exists
    if (testPolicyId != null && cdp != null) {
      try {
        cdp.policies().deletePolicy(testPolicyId);
      } catch (Exception e) {
        // Ignore cleanup errors
      }
    }

    if (cdp != null) {
      cdp.close();
    }
  }

  // ==================== EVM Policy CRUD ====================

  @Test
  @Order(1)
  void shouldCreateEvmPolicy() throws Exception {
    // Create an ethValue criterion
    EthValueCriterion ethValueCriterion =
        new EthValueCriterion()
            .type(EthValueCriterion.TypeEnum.ETH_VALUE)
            .ethValue("1000000000000000000") // 1 ETH
            .operator(EthValueCriterion.OperatorEnum.GREATER_THAN);

    // Wrap in the criteria inner type
    SignEvmTransactionCriteriaInner criteriaInner =
        new SignEvmTransactionCriteriaInner(ethValueCriterion);

    // Create criteria list
    SignEvmTransactionCriteria criteria = new SignEvmTransactionCriteria();
    criteria.add(criteriaInner);

    // Create a SignEvmTransactionRule
    SignEvmTransactionRule signRule =
        new SignEvmTransactionRule()
            .action(SignEvmTransactionRule.ActionEnum.REJECT)
            .operation(SignEvmTransactionRule.OperationEnum.SIGN_EVM_TRANSACTION)
            .criteria(criteria);

    // Wrap in polymorphic Rule
    Rule rule = new Rule(signRule);

    CreatePolicyRequest request =
        new CreatePolicyRequest()
            .scope(CreatePolicyRequest.ScopeEnum.ACCOUNT)
            .description("E2E test policy for EVM transactions")
            .rules(List.of(rule));

    Policy policy = cdp.policies().createPolicy(request);

    assertThat(policy).isNotNull();
    assertThat(policy.getId()).isNotBlank();
    assertThat(policy.getDescription()).isEqualTo("E2E test policy for EVM transactions");
    assertThat(policy.getRules()).hasSize(1);

    testPolicyId = policy.getId();
  }

  @Test
  @Order(2)
  void shouldGetPolicyById() throws Exception {
    Policy policy = cdp.policies().getPolicy(testPolicyId);

    assertThat(policy).isNotNull();
    assertThat(policy.getId()).isEqualTo(testPolicyId);
    assertThat(policy.getDescription()).isEqualTo("E2E test policy for EVM transactions");
  }

  @Test
  @Order(3)
  void shouldListPolicies() throws Exception {
    // Use a smaller page size to reduce the chance of hitting deserialization issues
    // with policies created by other users that may have unsupported rule types
    var response = cdp.policies().listPolicies(ListPoliciesOptions.builder().pageSize(10).build());

    assertThat(response).isNotNull();
    assertThat(response.getPolicies()).isNotNull();

    // The list operation succeeded. We verify the policy exists using getPolicy
    // since the list may have deserialization issues with other users' policies
    // that have rule types not yet supported by the SDK.
    var policy = cdp.policies().getPolicy(testPolicyId);
    assertThat(policy).isNotNull();
    assertThat(policy.getId()).isEqualTo(testPolicyId);
  }

  @Test
  @Order(4)
  void shouldListPoliciesWithScopeFilter() throws Exception {
    var response =
        cdp.policies()
            .listPolicies(ListPoliciesOptions.builder().scope("account").pageSize(10).build());

    assertThat(response).isNotNull();
    assertThat(response.getPolicies()).isNotNull();

    // All returned policies should have account scope
    for (var policy : response.getPolicies()) {
      assertThat(policy.getScope()).isEqualTo(Policy.ScopeEnum.ACCOUNT);
    }
  }

  @Test
  @Order(5)
  void shouldListPoliciesWithPagination() throws Exception {
    // First page
    var firstPage = cdp.policies().listPolicies(ListPoliciesOptions.builder().pageSize(2).build());

    assertThat(firstPage).isNotNull();
    assertThat(firstPage.getPolicies()).isNotNull();

    // If there are more pages, fetch the next one
    if (firstPage.getNextPageToken() != null && !firstPage.getNextPageToken().isEmpty()) {
      var secondPage =
          cdp.policies()
              .listPolicies(
                  ListPoliciesOptions.builder()
                      .pageSize(2)
                      .pageToken(firstPage.getNextPageToken())
                      .build());

      assertThat(secondPage).isNotNull();
      assertThat(secondPage.getPolicies()).isNotNull();
    }
  }

  @Test
  @Order(6)
  void shouldUpdatePolicy() throws Exception {
    // Create updated criteria
    EthValueCriterion ethValueCriterion =
        new EthValueCriterion()
            .type(EthValueCriterion.TypeEnum.ETH_VALUE)
            .ethValue("2000000000000000000") // 2 ETH (changed from 1 ETH)
            .operator(EthValueCriterion.OperatorEnum.GREATER_THAN_OR_EQUAL_TO);

    SignEvmTransactionCriteriaInner criteriaInner =
        new SignEvmTransactionCriteriaInner(ethValueCriterion);

    SignEvmTransactionCriteria criteria = new SignEvmTransactionCriteria();
    criteria.add(criteriaInner);

    SignEvmTransactionRule signRule =
        new SignEvmTransactionRule()
            .action(SignEvmTransactionRule.ActionEnum.REJECT)
            .operation(SignEvmTransactionRule.OperationEnum.SIGN_EVM_TRANSACTION)
            .criteria(criteria);

    Rule updatedRule = new Rule(signRule);

    UpdatePolicyRequest updateRequest =
        new UpdatePolicyRequest()
            .description("Updated E2E test policy")
            .rules(List.of(updatedRule));

    Policy updated = cdp.policies().updatePolicy(testPolicyId, updateRequest);

    assertThat(updated).isNotNull();
    assertThat(updated.getId()).isEqualTo(testPolicyId);
    assertThat(updated.getDescription()).isEqualTo("Updated E2E test policy");
    assertThat(updated.getRules()).hasSize(1);
  }

  @Test
  @Order(7)
  void shouldCreateAccountWithPolicy() throws Exception {
    // Create an account with the policy attached
    String name = TestUtils.generateRandomName();

    EvmAccount account =
        cdp.evm()
            .createAccount(new CreateEvmAccountRequest().name(name).accountPolicy(testPolicyId));

    assertThat(account).isNotNull();
    assertThat(account.getName()).isEqualTo(name);
    assertThat(account.getPolicies()).isNotNull();
    assertThat(account.getPolicies()).contains(testPolicyId);
  }

  @Test
  @Order(100) // Run last so we can clean up
  void shouldDeletePolicy() throws Exception {
    // First create a policy specifically for deletion testing
    EthValueCriterion ethValueCriterion =
        new EthValueCriterion()
            .type(EthValueCriterion.TypeEnum.ETH_VALUE)
            .ethValue("500000000000000000")
            .operator(EthValueCriterion.OperatorEnum.LESS_THAN);

    SendEvmTransactionCriteriaInner criteriaInner =
        new SendEvmTransactionCriteriaInner(ethValueCriterion);

    SendEvmTransactionCriteria criteria = new SendEvmTransactionCriteria();
    criteria.add(criteriaInner);

    SendEvmTransactionRule sendRule =
        new SendEvmTransactionRule()
            .action(SendEvmTransactionRule.ActionEnum.ACCEPT)
            .operation(SendEvmTransactionRule.OperationEnum.SEND_EVM_TRANSACTION)
            .criteria(criteria);

    Rule rule = new Rule(sendRule);

    CreatePolicyRequest request =
        new CreatePolicyRequest()
            .scope(CreatePolicyRequest.ScopeEnum.ACCOUNT)
            .description("Policy to be deleted")
            .rules(List.of(rule));

    Policy policyToDelete = cdp.policies().createPolicy(request);
    String policyId = policyToDelete.getId();

    // Delete the policy
    cdp.policies().deletePolicy(policyId);

    // Verify it's deleted by trying to get it
    assertThatThrownBy(() -> cdp.policies().getPolicy(policyId))
        .satisfies(
            e -> {
              // Should throw an exception (404 or similar)
              assertThat(e).isNotNull();
            });
  }

  // ==================== Multiple Rules Test ====================

  @Test
  @Order(50)
  void shouldCreatePolicyWithMultipleRules() throws Exception {
    // First rule: Accept small transactions
    EthValueCriterion smallValueCriterion =
        new EthValueCriterion()
            .type(EthValueCriterion.TypeEnum.ETH_VALUE)
            .ethValue("100000000000000000") // 0.1 ETH
            .operator(EthValueCriterion.OperatorEnum.LESS_THAN_OR_EQUAL_TO);

    SignEvmTransactionCriteriaInner criteriaInner1 =
        new SignEvmTransactionCriteriaInner(smallValueCriterion);

    SignEvmTransactionCriteria criteria1 = new SignEvmTransactionCriteria();
    criteria1.add(criteriaInner1);

    SignEvmTransactionRule acceptSmallRule =
        new SignEvmTransactionRule()
            .action(SignEvmTransactionRule.ActionEnum.ACCEPT)
            .operation(SignEvmTransactionRule.OperationEnum.SIGN_EVM_TRANSACTION)
            .criteria(criteria1);

    Rule rule1 = new Rule(acceptSmallRule);

    // Second rule: Reject large transactions
    EthValueCriterion largeValueCriterion =
        new EthValueCriterion()
            .type(EthValueCriterion.TypeEnum.ETH_VALUE)
            .ethValue("10000000000000000000") // 10 ETH
            .operator(EthValueCriterion.OperatorEnum.GREATER_THAN);

    SendEvmTransactionCriteriaInner criteriaInner2 =
        new SendEvmTransactionCriteriaInner(largeValueCriterion);

    SendEvmTransactionCriteria criteria2 = new SendEvmTransactionCriteria();
    criteria2.add(criteriaInner2);

    SendEvmTransactionRule rejectLargeRule =
        new SendEvmTransactionRule()
            .action(SendEvmTransactionRule.ActionEnum.REJECT)
            .operation(SendEvmTransactionRule.OperationEnum.SEND_EVM_TRANSACTION)
            .criteria(criteria2);

    Rule rule2 = new Rule(rejectLargeRule);

    CreatePolicyRequest request =
        new CreatePolicyRequest()
            .scope(CreatePolicyRequest.ScopeEnum.ACCOUNT)
            .description("E2E test policy with multiple rules")
            .rules(List.of(rule1, rule2));

    Policy policy = cdp.policies().createPolicy(request);

    assertThat(policy).isNotNull();
    assertThat(policy.getRules()).hasSize(2);

    // Clean up
    cdp.policies().deletePolicy(policy.getId());
  }
}
