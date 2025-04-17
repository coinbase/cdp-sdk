import { Address } from "viem";

// Importing types from the existing policy.ts
type ValueOperator = ">" | ">=" | "<" | "<=" | "==";
type AddressOperator = "in" | "not in";
type Action = "reject" | "accept";
type EvmOperation = "signEvmTransaction";
type SolanaOperation = "signSolanaTransaction";
type Operation = EvmOperation | SolanaOperation;
type Scope = "project" | "account";

/**
 * Abstract base class for all criteria types
 */
abstract class Criterion {
  /**
   * Create a criterion with a specified type
   *
   * @param type - The type identifier for this criterion
   */
  constructor(public readonly type: string) {}
}

/**
 * Criterion for Ethereum value-based rules
 */
class EvmValueCriterion extends Criterion {
  /**
   * Create a new ETH value criterion
   *
   * @param ethValue - The Ethereum value to compare against
   * @param operator - The comparison operator to use
   */
  constructor(
    public readonly ethValue: bigint,
    public readonly operator: ValueOperator,
  ) {
    super("ethValue");
  }
}

/**
 * Criterion for Ethereum address-based rules
 */
class EvmAddressCriterion extends Criterion {
  /**
   * Create a new EVM address criterion
   *
   * @param addresses - The list of Ethereum addresses to compare against
   * @param operator - The operator to use for address comparison
   */
  constructor(
    public readonly addresses: Address[],
    public readonly operator: AddressOperator,
  ) {
    super("evmAddress");
  }
}

/**
 * Criterion for Solana value-based rules
 */
class SolanaValueCriterion extends Criterion {
  /**
   * Create a new Solana value criterion
   *
   * @param solValue - The Solana value to compare against
   * @param operator - The comparison operator to use
   */
  constructor(
    public readonly solValue: bigint,
    public readonly operator: ValueOperator,
  ) {
    super("solValue");
  }
}

/**
 * Criterion for Solana address-based rules
 */
class SolanaAddressCriterion extends Criterion {
  /**
   * Create a new Solana address criterion
   *
   * @param addresses - The list of Solana addresses to compare against
   * @param operator - The operator to use for address comparison
   */
  constructor(
    public readonly addresses: Address[],
    public readonly operator: AddressOperator,
  ) {
    super("solanaAddress");
  }
}

/**
 * Rule class that stores action, operation and associated criteria
 *
 * @template T - The operation type this rule applies to
 */
class Rule<T extends Operation> {
  private criteria: Criterion[] = [];

  /**
   * Create a new rule
   *
   * @param action - The action to take (accept/reject)
   * @param operation - The blockchain operation this rule applies to
   */
  constructor(
    public readonly action: Action,
    public readonly operation: T,
  ) {}

  /**
   * Add a criterion to this rule
   *
   * @param criterion - The criterion to add to this rule
   * @returns The rule instance for chaining
   */
  addCriterion(criterion: Criterion): Rule<T> {
    this.criteria.push(criterion);
    return this;
  }

  /**
   * Get all criteria for this rule
   *
   * @returns Array of criteria associated with this rule
   */
  getCriteria(): Criterion[] {
    return this.criteria;
  }
}

/**
 * Builder class for creating policies in a step-by-step manner
 *
 * @template T - The operation type this policy applies to
 */
class PolicyBuilder<T extends Operation> {
  private rules: Rule<T>[] = [];
  private policyScope: Scope = "project";
  private policyDescription?: string;
  private policyDefaultAction?: Action;

  /**
   * Set the scope for this policy
   *
   * @param scope - The scope of the policy (project/account)
   * @returns The builder instance for chaining
   */
  setScope(scope: Scope): PolicyBuilder<T> {
    this.policyScope = scope;
    return this;
  }

  /**
   * Set a description for this policy
   *
   * @param description - Human-readable description of the policy
   * @returns The builder instance for chaining
   */
  setDescription(description: string): PolicyBuilder<T> {
    this.policyDescription = description;
    return this;
  }

  /**
   * Set the default action for this policy
   *
   * @param action - The default action to take if no rules match
   * @returns The builder instance for chaining
   */
  setDefaultAction(action: Action): PolicyBuilder<T> {
    this.policyDefaultAction = action;
    return this;
  }

  /**
   * Add a rule to this policy
   *
   * @param rule - The rule to add to this policy
   * @returns The builder instance for chaining
   */
  addRule(rule: Rule<T>): PolicyBuilder<T> {
    this.rules.push(rule);
    return this;
  }

  /**
   * Build the final policy object
   *
   * @returns A fully configured policy object ready to be used with the CDP API
   */
  build() {
    return {
      rules: this.rules.map(rule => ({
        action: rule.action,
        operation: rule.operation,
        criteria: rule.getCriteria().map(criterion => {
          // Transform to the format expected by the API
          let result;

          switch (criterion.type) {
            case "ethValue": {
              const evmValueCriterion = criterion as EvmValueCriterion;
              result = {
                type: "ethValue",
                ethValue: evmValueCriterion.ethValue,
                operator: evmValueCriterion.operator,
              };
              break;
            }
            case "evmAddress": {
              const evmAddressCriterion = criterion as EvmAddressCriterion;
              result = {
                type: "evmAddress",
                addresses: evmAddressCriterion.addresses,
                operator: evmAddressCriterion.operator,
              };
              break;
            }
            case "solValue": {
              const solValueCriterion = criterion as SolanaValueCriterion;
              result = {
                type: "solValue",
                solValue: solValueCriterion.solValue,
                operator: solValueCriterion.operator,
              };
              break;
            }
            case "solanaAddress": {
              const solAddressCriterion = criterion as SolanaAddressCriterion;
              result = {
                type: "solanaAddress",
                addresses: solAddressCriterion.addresses,
                operator: solAddressCriterion.operator,
              };
              break;
            }
            default:
              throw new Error(`Unknown criterion type: ${criterion.type}`);
          }

          return result;
        }),
      })),
      scope: this.policyScope,
      ...(this.policyDescription && { description: this.policyDescription }),
      ...(this.policyDefaultAction && { defaultAction: this.policyDefaultAction }),
    };
  }
}

// Factory classes for creating specific builders
/**
 *
 */
export class EvmPolicyBuilder extends PolicyBuilder<EvmOperation> {}
/**
 *
 */
export class SolanaPolicyBuilder extends PolicyBuilder<SolanaOperation> {}

// Factory functions for creating criteria
export const createEvmValueCriterion = (
  ethValue: bigint,
  operator: ValueOperator,
): EvmValueCriterion => {
  return new EvmValueCriterion(ethValue, operator);
};

export const createEvmAddressCriterion = (
  addresses: Address[],
  operator: AddressOperator,
): EvmAddressCriterion => {
  return new EvmAddressCriterion(addresses, operator);
};

export const createSolanaValueCriterion = (
  solValue: bigint,
  operator: ValueOperator,
): SolanaValueCriterion => {
  return new SolanaValueCriterion(solValue, operator);
};

export const createSolanaAddressCriterion = (
  addresses: Address[],
  operator: AddressOperator,
): SolanaAddressCriterion => {
  return new SolanaAddressCriterion(addresses, operator);
};

// Factory functions for creating rules
export const createEvmRule = (action: Action): Rule<EvmOperation> => {
  return new Rule<EvmOperation>(action, "signEvmTransaction");
};

export const createSolanaRule = (action: Action): Rule<SolanaOperation> => {
  return new Rule<SolanaOperation>(action, "signSolanaTransaction");
};

/**
 * Example showing how to use the policy builder
 * This function is commented out to avoid linter errors about unused functions
 */
async function main() {
  const policy = new EvmPolicyBuilder()
    .setScope("project")
    .setDescription("Example EVM policy")
    .setDefaultAction("reject")
    .addRule(
      createEvmRule("accept")
        .addCriterion(createEvmValueCriterion(100n, ">"))
        .addCriterion(
          createEvmAddressCriterion(["0x1234567890123456789012345678901234567890"], "in"),
        ),
    )
    .addRule(
      createEvmRule("accept")
        .addCriterion(createEvmValueCriterion(1000n, ">"))
        .addCriterion(
          createEvmAddressCriterion(["0x1234567890123456789012345678901234567890"], "in"),
        ),
    )
    .build();

  console.log(
    JSON.stringify(
      policy,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
}

main().catch(console.error);
