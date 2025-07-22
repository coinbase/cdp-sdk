/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Converts bigint values in an object to strings for safe serialization
 *
 * @param obj - The object to convert
 * @returns A new object with bigint values converted to strings
 */
export const convertBigIntsToStrings = (obj: any): any => {
  if (typeof obj === "bigint") {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntsToStrings);
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, convertBigIntsToStrings(v)]));
  }
  return obj;
};
