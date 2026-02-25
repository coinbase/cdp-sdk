import { z } from "zod";

/**
 * Schema for rate limiting criterions.
 * A criterion that limits the number or value of operations within a time window.
 * When the limit is exceeded, subsequent operations matching this criterion will be
 * rejected until the window resets.
 */
export const RateLimitingCriterionSchema = z.object({
  /** The type of criterion, must be "rateLimiting" for rate limiting rules. */
  type: z.literal("rateLimiting"),
  /**
   * The time window for the rate limit.
   * Operations are counted within this rolling window.
   * @example "4d2h45m"
   */
  window: z.string().min(1),
  /**
   * The maximum number of operations allowed within the window.
   * When the count is exceeded, subsequent operations will be rejected.
   * Mutually exclusive with `maxValueCents`.
   */
  maxCount: z.number().int().nonnegative().optional(),
  /**
   * The maximum cumulative USD value in cents of operations allowed within the window.
   * When the value is exceeded, subsequent operations will be rejected.
   * Mutually exclusive with `maxCount`.
   */
  maxValueCents: z.number().int().nonnegative().optional(),
});
/**
 * Type representing a rate limiting criterion that restricts
 * the number or value of operations within a time window.
 */
export type RateLimitingCriterion = z.infer<typeof RateLimitingCriterionSchema>;
