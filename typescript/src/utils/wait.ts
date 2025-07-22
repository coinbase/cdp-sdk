import { TimeoutError } from "../errors.js";

/**
 * Options for the wait function
 */
export type WaitOptions = {
  /** Interval between retries in seconds. Defaults to 0.2 */
  intervalSeconds?: number;
  /** Maximum time to wait before timing out in seconds. Defaults to 10 */
  timeoutSeconds?: number;
};

/**
 * Polls a resource until a terminal condition is met or timeout occurs.
 *
 * @param reload - Function that fetches the latest state of the resource
 * @param isTerminal - Function that determines if the current state is terminal
 * @param transform - Function that transforms the resource into a new type
 * @param options - Configuration options for polling behavior
 * @returns The resource in its terminal state
 * @throws {TimeoutError} If the operation exceeds the timeout duration
 *
 * @example
 * const result = await wait(
 *   () => fetchOrderStatus(orderId),
 *   (status) => status === 'completed',
 *   (status) => status === 'completed' ? { status } : undefined,
 *   { timeoutSeconds: 30 }
 * );
 */
export async function wait<T, K = T>(
  reload: () => Promise<T>,
  isTerminal: (obj: T) => boolean,
  transform: (obj: T) => K = (obj: T) => obj as unknown as K,
  options: WaitOptions = {},
): Promise<K> {
  const { intervalSeconds = 0.2, timeoutSeconds = 10 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutSeconds * 1000) {
    const updatedObject = await reload();

    if (isTerminal(updatedObject)) {
      return transform(updatedObject);
    }

    await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
  }
  throw new TimeoutError(
    `Operation has not reached a terminal state after ${timeoutSeconds} seconds and may still succeed. Retry with a longer timeout using the timeoutSeconds option.`,
  );
}
