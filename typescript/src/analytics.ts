import md5 from "md5";

import { CdpClient } from "./client/cdp.js";
import { EvmClient } from "./client/evm/evm.js";
import { SolanaClient } from "./client/solana/solana.js";

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

type EventData = ErrorEventData;

/**
 * Sends an analytics event to the default endpoint
 *
 * @param event - The event data containing event-specific fields
 * @returns Promise that resolves when the event is sent
 */
export async function sendEvent(event: EventData): Promise<void> {
  const timestamp = Date.now();

  const enhancedEvent = {
    event_type: event.name,
    platform: "server",
    event_properties: {
      platform: "server",
      project_name: "cdp-sdk",
      time_start: timestamp,
      cdp_sdk_language: "typescript",
      ...event,
    },
  };

  const events = [enhancedEvent];
  const stringifiedEventData = JSON.stringify(events);
  const uploadTime = timestamp.toString();

  const checksum = md5(stringifiedEventData + uploadTime);

  const analyticsServiceData = {
    e: stringifiedEventData,
    checksum,
  };

  const apiEndpoint = "https://cca-lite.coinbase.com";
  const eventPath = "/amp";
  const eventEndPoint = `${apiEndpoint}${eventPath}`;

  const response = await fetch(eventEndPoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(analyticsServiceData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Wraps all methods of a class with error tracking.
 *
 * @param ClassToWrap - The class whose prototype methods should be wrapped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapClassWithErrorTracking(ClassToWrap: any): void {
  const methodNames = Object.getOwnPropertyNames(ClassToWrap.prototype).filter(
    name => name !== "constructor" && typeof ClassToWrap.prototype[name] === "function",
  );

  for (const methodName of methodNames) {
    const originalMethod = ClassToWrap.prototype[methodName];
    ClassToWrap.prototype[methodName] = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (!(error instanceof Error)) {
          return;
        }

        const { message, stack } = error;

        if (process.env.DISABLE_CDP_ERROR_REPORTING !== "true") {
          sendEvent({
            method: String(methodName),
            message,
            stack,
            name: "error",
          }).catch(() => {
            // ignore error
          });
        }

        throw error;
      }
    };
  }
}

wrapClassWithErrorTracking(CdpClient);
wrapClassWithErrorTracking(EvmClient);
wrapClassWithErrorTracking(SolanaClient);
