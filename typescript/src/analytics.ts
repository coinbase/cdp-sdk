import md5 from "md5";

/**
 * The data in an error event
 */
type ErrorEventData = {
  /**
   * The API method where the error occurred, e.g. createAccount, getAccount
   */
  method: string;
  /**
   * The error message
   */
  message: string;
  /**
   * The error stack trace
   */
  stack?: string;
  /**
   * The name of the event. This should match the name in AEC
   */
  name: "error";
};

type EventData = ErrorEventData & {
  apiKeyId: string;
};

// This is a public client id for the analytics service
const publicClientId = "54f2ee2fb3d2b901a829940d70fbfc13";

/**
 * Sends an analytics event to the default endpoint
 *
 * @param event - The event data containing event-specific fields
 * @returns Promise that resolves when the event is sent
 */
export async function sendEvent(event: EventData): Promise<void> {
  const timestamp = Date.now();

  const enhancedEvent = {
    user_id: event.apiKeyId,
    event_type: event.name,
    platform: "server",
    timestamp,
    event_properties: {
      project_name: "cdp-sdk",
      cdp_sdk_language: "typescript",
      ...event,
    },
  };

  const events = [enhancedEvent];
  const stringifiedEventData = JSON.stringify(events);
  const uploadTime = timestamp.toString();

  const checksum = md5(stringifiedEventData + uploadTime);

  const analyticsServiceData = {
    client: publicClientId,
    e: stringifiedEventData,
    checksum,
  };

  const apiEndpoint = "https://cca-lite.coinbase.com";
  const eventPath = "/amp";
  const eventEndPoint = `${apiEndpoint}${eventPath}`;

  await fetch(eventEndPoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(analyticsServiceData),
  });
}

/**
 * Wraps all methods of a class with error tracking.
 *
 * @param ClassToWrap - The class whose prototype methods should be wrapped.
 * @param apiKeyId - The API key ID to use for the error tracking.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapClassWithErrorTracking(ClassToWrap: any, apiKeyId: string): void {
  const methods = Object.getOwnPropertyNames(ClassToWrap.prototype).filter(
    name => name !== "constructor" && typeof ClassToWrap.prototype[name] === "function",
  );

  for (const method of methods) {
    const originalMethod = ClassToWrap.prototype[method];
    ClassToWrap.prototype[method] = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (!(error instanceof Error)) {
          return;
        }

        const { message, stack } = error;

        sendEvent({
          apiKeyId,
          method,
          message,
          stack,
          name: "error",
        }).catch(() => {
          // ignore error
        });

        throw error;
      }
    };
  }
}
