/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable jsdoc/require-jsdoc */
import { randomUUID } from "crypto";
import { Address } from "viem";

type ValueOperator = ">" | ">=" | "<" | "<=" | "==";
type AddressOperator = "in" | "not in";
type Action = "reject" | "accept";
type EvmOperation = "signEvmTransaction";
type SolanaOperation = "signSolanaTransaction";
type Operation = EvmOperation | SolanaOperation;
type Scope = "project" | "account";

type EvmValueCriterion = {
  type: "ethValue";
  ethValue: bigint;
  operator: ValueOperator;
};

type EvmAddressCriterion = {
  type: "evmAddress";
  addresses: Address[];
  operator: AddressOperator;
};

type SignEvmTransactionCriteria = (EvmValueCriterion | EvmAddressCriterion)[];

type SolanaValueCriterion = {
  type: "solValue";
  solValue: bigint;
  operator: ValueOperator;
};

type SolanaAddressCriterion = {
  type: "solanaAddress";
  addresses: Address[];
  operator: AddressOperator;
};

type SignSolanaTransactionCriteria = (SolanaValueCriterion | SolanaAddressCriterion)[];

type Rule<op extends Operation> = {
  action: Action;
  operation: op;
  criteria: op extends EvmOperation ? SignEvmTransactionCriteria : SignSolanaTransactionCriteria;
};

type Policy<op extends Operation> = {
  rules: Rule<op>[];
  scope: Scope;
  description?: string;
  defaultAction?: Action;
};

const cdp = {
  evm: {
    createPolicy: async function (policy: Policy<EvmOperation>) {
      return randomUUID();
    },
  },
  solana: {
    createPolicy: async function (policy: Policy<SolanaOperation>) {
      return randomUUID();
    },
  },
};

async function main() {
  const rule: Rule<EvmOperation> = {
    operation: "signEvmTransaction",
    action: "reject",
    criteria: [],
  };

  const policyId = await cdp.evm.createPolicy({
    scope: "project",
    rules: [
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "ethValue",
            ethValue: 100n,
            operator: ">",
          },
        ],
      },
      {
        action: "accept",
        operation: "signEvmTransaction",
        criteria: [
          {
            type: "evmAddress",
            addresses: ["0x1234567890123456789012345678901234567890"],
            operator: "in",
          },
        ],
      },
    ],
  });

  console.log(policyId);
}

main().catch(console.error);
