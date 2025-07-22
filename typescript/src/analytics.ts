import md5 from "md5";

import { UserInputValidationError } from "./errors.js";
import { APIError, NetworkError } from "./openapi-client/errors.js";
import { version } from "./version.js";

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

/**
 * The data in an action event
 */
type ActionEventData = {
  /**
   * The operation being performed, e.g. "transfer", "swap", "fund", "requestFaucet"
   */
  action: string;
  /**
   * The account type, e.g. "evm-server", "evm-smart", "solana"
   */
  accountType?: "evm_server" | "evm_smart" | "solana";
  /**
   * Additional properties specific to the action
   */
  properties?: Record<string, unknown>;
  /**
   * The name of the event
   */
  name: "action";
};

type EventData = ErrorEventData | ActionEventData;

// This is a public client id for the analytics service
const publicClientId = "54f2ee2fb3d2b901a829940d70fbfc13";

export const Analytics = {
  identifier: "", // set in cdp.ts
  wrapClassWithErrorTracking,
  wrapObjectMethodsWithErrorTracking,
  sendEvent,
  trackAction,
};

/**
 * Sends an analytics event to the default endpoint
 *
 * @param event - The event data containing event-specific fields
 * @returns Promise that resolves when the event is sent
 */
async function sendEvent(event: EventData): Promise<void> {
  if (event.name === "error" && process.env.DISABLE_CDP_ERROR_REPORTING === "true") {
    return;
  }

  if (event.name !== "error" && process.env.DISABLE_CDP_USAGE_TRACKING === "true") {
    return;
  }

  const timestamp = Date.now();

  const enhancedEvent = {
    user_id: Analytics.identifier,
    event_type: event.name,
    platform: "server",
    timestamp,
    event_properties: {
      project_name: "cdp-sdk",
      cdp_sdk_language: "typescript",
      version,
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
 * Track an action being performed
 *
 * @param params - The parameters for tracking an action
 * @param params.action - The action being performed
 * @param params.accountType - The type of account
 * @param params.properties - Additional properties
 */
function trackAction(params: {
  action: string;
  accountType?: "evm_server" | "evm_smart" | "solana";
  properties?: Record<string, unknown>;
}): void {
  if (
    params.properties?.network &&
    typeof params.properties.network === "string" &&
    params.properties.network.startsWith("http")
  ) {
    const url = new URL(params.properties.network);
    params.properties.customRpcHost = url.hostname;
    params.properties.network = "custom";
  }

  sendEvent({
    action: params.action,
    accountType: params.accountType,
    properties: params.properties,
    name: "action",
  }).catch(() => {
    // ignore error
  });
}

/**
 * Wraps all methods of a class with error tracking.
 *
 * @param ClassToWrap - The class whose prototype methods should be wrapped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapClassWithErrorTracking(ClassToWrap: any): void {
  if (process.env.DISABLE_CDP_ERROR_REPORTING === "true") {
    return;
  }

  const methods = Object.getOwnPropertyNames(ClassToWrap.prototype).filter(
    name => name !== "constructor" && typeof ClassToWrap.prototype[name] === "function",
  );

  for (const method of methods) {
    const originalMethod = ClassToWrap.prototype[method];
    ClassToWrap.prototype[method] = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (!shouldTrackError(error)) {
          throw error;
        }

        const { message, stack } = error as Error;

        sendEvent({
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

/**
 * Wraps all methods of an object with error tracking.
 *
 * @param object - The object whose methods should be wrapped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapObjectMethodsWithErrorTracking(object: any): void {
  if (process.env.DISABLE_CDP_ERROR_REPORTING === "true") {
    return;
  }

  const methods = Object.getOwnPropertyNames(object).filter(
    name => name !== "constructor" && typeof object[name] === "function",
  );

  for (const method of methods) {
    const originalMethod = object[method];
    object[method] = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (!shouldTrackError(error)) {
          throw error;
        }

        const { message, stack } = error as Error;

        sendEvent({
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

/**
 * Filters out non-errors and API errors
 *
 * @param error - The error to check.
 * @returns True if the error should be tracked, false otherwise.
 */
function shouldTrackError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error instanceof UserInputValidationError) {
    return false;
  }

  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof APIError && error.errorType !== "unexpected_error") {
    return false;
  }

  return true;
}
