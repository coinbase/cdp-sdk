// Usage: pnpm tsx policies/validation.ts

import { CreatePolicyBodySchema, UpdatePolicyBodySchema } from "@coinbase/cdp-sdk";

const invalidPolicy = {
  description: 'Bad description with !#@ characters, also is wayyyyy toooooo long!!',
  rules: [
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: [
        {
          type: 'ethValue',
          ethValue: 'not a number',
          operator: '<='
        },
        {
          type: 'evmAddress',
          addresses: ["not an address"],
          operator: 'in'
        },
        {
          type: 'evmAddress',
          addresses: ["not an address"],
          operator: 'invalid operator'
        }
      ]
    },
    {
      action: 'accept',
      operation: 'unknownOperation',
      criteria: []
    },
    {
      action: 'accept',
      operation: 'signEvmTransaction',
      criteria: []
    }
  ]
}

// Validate a new Policy with several issues, will throw the below ZodError with actionable validation errors
CreatePolicyBodySchema.parse(invalidPolicy)
// OR
UpdatePolicyBodySchema.parse(invalidPolicy)

// https://zod.dev/ERROR_HANDLING
// ZodError: [
//   {
//     "expected": "'project' | 'account'",
//     "received": "undefined",
//     "code": "invalid_type",
//     "path": [
//       "scope"
//     ],
//     "message": "Required"
//   },
//   {
//     "validation": "regex",
//     "code": "invalid_string",
//     "message": "Invalid",
//     "path": [
//       "description"
//     ]
//   },
//   {
//     "validation": "regex",
//     "code": "invalid_string",
//     "message": "Invalid",
//     "path": [
//       "rules",
//       0,
//       "criteria",
//       0,
//       "ethValue"
//     ]
//   },
//   {
//     "code": "custom",
//     "message": "Invalid Address not an address",
//     "path": [
//       "rules",
//       0,
//       "criteria",
//       1,
//       "addresses",
//       0
//     ]
//   },
//   {
//     "code": "custom",
//     "message": "Invalid Address not an address",
//     "path": [
//       "rules",
//       0,
//       "criteria",
//       2,
//       "addresses",
//       0
//     ]
//   },
//   {
//     "received": "invalid operator",
//     "code": "invalid_enum_value",
//     "options": [
//       "in",
//       "not in"
//     ],
//     "path": [
//       "rules",
//       0,
//       "criteria",
//       2,
//       "operator"
//     ],
//     "message": "Invalid enum value. Expected 'in' | 'not in', received 'invalid operator'"
//   },
//   {
//     "code": "invalid_union_discriminator",
//     "options": [
//       "signEvmTransaction",
//       "signSolTransaction"
//     ],
//     "path": [
//       "rules",
//       1,
//       "operation"
//     ],
//     "message": "Invalid discriminator value. Expected 'signEvmTransaction' | 'signSolTransaction'"
//   },
//   {
//     "code": "too_small",
//     "minimum": 1,
//     "type": "array",
//     "inclusive": true,
//     "exact": false,
//     "message": "Array must contain at least 1 element(s)",
//     "path": [
//       "rules",
//       2,
//       "criteria"
//     ]
//   }
// ]
