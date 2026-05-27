/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Recursively sorts object keys to ensure consistent JSON stringification
 *
 * @param obj - The object to sort
 * @returns A new object with sorted keys
 */
export const sortKeys = (obj: any): any => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }

  return Object.keys(obj)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      },
      {} as Record<string, any>,
    );
};
