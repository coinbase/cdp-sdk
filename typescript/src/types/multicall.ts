// Adapted from viem (https://github.com/wevm/viem)
import type {
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionParameters,
} from "./contract.js";
import type { Abi, AbiStateMutability } from "abitype";

// infer contract parameters from `unknown`
export type GetMulticallContractParameters<
  contract,
  mutability extends AbiStateMutability,
> = contract extends { abi: infer abi extends Abi } // 1. Check if `abi` is const-asserted or defined inline
  ? // 1a. Check if `functionName` is valid for `abi`
    contract extends {
      functionName: infer functionName extends ContractFunctionName<abi, mutability>;
    }
    ? // 1aa. Check if `args` is valid for `abi` and `functionName`
      contract extends {
        args: infer args extends ContractFunctionArgs<abi, mutability, functionName>;
      }
      ? ContractFunctionParameters<abi, mutability, functionName, args> // `args` valid, pass through
      : ContractFunctionParameters<abi, mutability, functionName> // invalid `args`
    : // 1b. `functionName` is invalid, check if `abi` is declared as `Abi`
      Abi extends abi
      ? ContractFunctionParameters // `abi` declared as `Abi`, unable to infer types further
      : // `abi` is const-asserted or defined inline, infer types for `functionName` and `args`
        ContractFunctionParameters<abi, mutability>
  : ContractFunctionParameters<readonly unknown[]>; // invalid `contract['abi']`, set to `readonly unknown[]`
