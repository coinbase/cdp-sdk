import { PolicyScope, Rule } from "./schema.js";

/**
 * A single Policy that can be used to govern the behavior of projects and accounts.
 */
export type Policy = {
  /** The unique identifier for the policy. */
  id: string;
  /** An optional human-readable description of the policy. */
  description?: string;
  /** The scope of the policy. Only one project-level policy can exist at any time. */
  scope: PolicyScope;
  /** A list of rules that comprise the policy. */
  rules: Rule[];
  /** The ISO 8601 timestamp at which the Policy was created. */
  createdAt: string;
  /** The ISO 8601 timestamp at which the Policy was last updated. */
  updatedAt: string;
};
