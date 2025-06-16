// Adapted from viem (https://github.com/wevm/viem)

import { Prettify } from "./utils.js";

import type { TypedData, TypedDataDomain, TypedDataToPrimitiveTypes } from "abitype";

export type TypedDataDefinition<
  typedData extends TypedData | Record<string, unknown> = TypedData,
  primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  ///
  primaryTypes = typedData extends TypedData ? keyof typedData : string,
> = MessageDefinition<typedData, primaryType, primaryTypes>;

type MessageDefinition<
  typedData extends TypedData | Record<string, unknown> = TypedData,
  primaryType extends keyof typedData = keyof typedData,
  ///
  primaryTypes = typedData extends TypedData ? keyof typedData : string,
  schema extends Record<string, unknown> = typedData extends TypedData
    ? TypedDataToPrimitiveTypes<typedData>
    : Record<string, unknown>,
  message = schema[primaryType extends keyof schema ? primaryType : keyof schema],
> = {
  types: typedData;
} & {
  primaryType:
    | primaryTypes // show all values
    | (primaryType extends primaryTypes ? primaryType : never); // infer value
  domain: schema extends { EIP712Domain: infer domain } ? domain : Prettify<TypedDataDomain>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: { [_: string]: any } extends message // Check if message was inferred
    ? Record<string, unknown>
    : message;
};
