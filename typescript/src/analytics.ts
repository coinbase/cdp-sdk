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

// Symbol to store the original method on wrapped functions
const ORIGINAL_METHOD = Symbol("originalMethod");

// This is a public client id for the analytics service
const publicClientId = "54f2ee2fb3d2b901a829940d70fbfc13";

export const Analytics = {
  identifier: "", // set in cdp.ts
  wrapClassWithErrorTracking,
  wrapObjectMethodsWithErrorTracking,
  sendEvent,
  trackAction,
};

/*
 * Deprecated implementation - kept for test compatibility
 * Shares the same identifier reference as Analytics
 */
export const AnalyticsDeprecated = {
  get identifier() {
    return Analytics.identifier;
  },
  set identifier(value: string) {
    Analytics.identifier = value;
  },
  wrapClassWithErrorTracking: wrapClassWithErrorTrackingDeprecated,
  wrapObjectMethodsWithErrorTracking: wrapObjectMethodsWithErrorTrackingDeprecated,
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
 * Gets the original method from a wrapped method, or returns the method itself if it's not wrapped.
 *
 * @param method - The method to get the original version of.
 * @returns The original unwrapped method, or the method itself if it's not wrapped.
 */
function getOriginalMethod(
  method: (this: unknown, ...args: unknown[]) => Promise<unknown>,
): (this: unknown, ...args: unknown[]) => Promise<unknown> {
  return (
    (method as { [ORIGINAL_METHOD]?: (this: unknown, ...args: unknown[]) => Promise<unknown> })[
      ORIGINAL_METHOD
    ] || method
  );
}

/**
 * Creates an interceptor function that prevents recursive calls by checking if the instance is already executing.
 *
 * @param executingInstances - A WeakSet tracking instances that are currently executing.
 * @param fallbackMethod - The method to call if recursion is not detected.
 * @returns A function that intercepts calls and prevents recursion.
 */
function createRecursiveInterceptor(
  executingInstances: WeakSet<object>,
  fallbackMethod: (...args: unknown[]) => Promise<unknown>,
): (...args: unknown[]) => Promise<unknown> {
  return function (this: unknown, ...callArgs: unknown[]) {
    if (executingInstances.has(this as object)) {
      return Promise.resolve(callArgs[0]);
    }
    return fallbackMethod.apply(this, callArgs);
  };
}

/**
 * Executes a method with recursion protection by tracking executing instances.
 *
 * @param executingInstances - A WeakSet tracking instances that are currently executing.
 * @param originalMethod - The original method to execute.
 * @param context - The context (this) to bind the method to.
 * @param args - The arguments to pass to the method.
 * @returns The result of executing the original method.
 */
async function executeWithRecursionProtection<T>(
  executingInstances: WeakSet<object>,
  originalMethod: (this: unknown, ...args: unknown[]) => Promise<T>,
  context: unknown,
  args: unknown[],
): Promise<T> {
  if (executingInstances.has(context as object)) {
    return args[0] as T;
  }
  executingInstances.add(context as object);
  try {
    return await originalMethod.apply(context, args);
  } finally {
    executingInstances.delete(context as object);
  }
}

/**
 * Handles an error that occurred in a method by sending an analytics event and rethrowing the error.
 *
 * @param error - The error that occurred.
 * @param methodName - The name of the method where the error occurred.
 */
async function handleMethodError(error: unknown, methodName: string): Promise<void> {
  if (!shouldTrackError(error)) {
    throw error;
  }

  const { message, stack } = error as Error;
  sendEvent({
    method: methodName,
    message,
    stack,
    name: "error",
  }).catch(() => {
    // ignore error
  });

  throw error;
}

/**
 * Creates a wrapper function that adds error tracking and recursion protection to a method.
 *
 * @param originalMethod - The original method to wrap.
 * @param methodName - The name of the method being wrapped.
 * @param executingInstances - A WeakSet tracking instances that are currently executing.
 * @param setMethod - A function to set the method implementation.
 * @param getMethod - A function to get the current method implementation.
 * @returns A wrapped version of the method with error tracking and recursion protection.
 */
function createErrorTrackingWrapper(
  originalMethod: (this: unknown, ...args: unknown[]) => Promise<unknown>,
  methodName: string,
  executingInstances: WeakSet<object>,
  setMethod: (method: (...args: unknown[]) => Promise<unknown>) => void,
  getMethod: () => (...args: unknown[]) => Promise<unknown>,
): (this: unknown, ...args: unknown[]) => Promise<unknown> {
  return async function (this: unknown, ...args: unknown[]) {
    const previousMethod = getMethod();
    const recursiveInterceptor = createRecursiveInterceptor(executingInstances, previousMethod);
    setMethod(recursiveInterceptor);

    try {
      const result = await executeWithRecursionProtection(
        executingInstances,
        originalMethod,
        this,
        args,
      );
      setMethod(previousMethod);
      return result;
    } catch (error) {
      setMethod(previousMethod);
      return handleMethodError(error, methodName);
    }
  };
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
    const currentMethod = ClassToWrap.prototype[method];
    const originalMethod = getOriginalMethod(currentMethod);
    const executingInstances = new WeakSet<object>();

    const wrappedMethod = createErrorTrackingWrapper(
      originalMethod,
      method,
      executingInstances,
      newMethod => {
        ClassToWrap.prototype[method] = newMethod as (
          this: unknown,
          ...args: unknown[]
        ) => Promise<unknown>;
      },
      () => ClassToWrap.prototype[method] as (...args: unknown[]) => Promise<unknown>,
    );

    (wrappedMethod as unknown as { [ORIGINAL_METHOD]: unknown })[ORIGINAL_METHOD] = originalMethod;
    ClassToWrap.prototype[method] = wrappedMethod;
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
    const currentMethod = object[method];
    const originalMethod = getOriginalMethod(currentMethod);
    const executingInstances = new WeakSet<object>();

    const wrappedMethod = createErrorTrackingWrapper(
      originalMethod,
      method,
      executingInstances,
      newMethod => {
        object[method] = newMethod;
      },
      () => object[method] as (...args: unknown[]) => Promise<unknown>,
    );

    (wrappedMethod as unknown as { [ORIGINAL_METHOD]: unknown })[ORIGINAL_METHOD] = originalMethod;
    object[method] = wrappedMethod;
  }
}

/**
 * Wraps all methods of a class with error tracking.
 *
 * @deprecated This is the old implementation that has a bug with methods calling themselves via prototype.
 * Use Analytics.wrapClassWithErrorTracking instead.
 * Kept for test compatibility.
 *
 * @param ClassToWrap - The class whose prototype methods should be wrapped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapClassWithErrorTrackingDeprecated(ClassToWrap: any): void {
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
 * @deprecated This is the old implementation that has a bug with methods calling themselves via object property.
 * Use Analytics.wrapObjectMethodsWithErrorTracking instead.
 * Kept for test compatibility.
 *
 * @param object - The object whose methods should be wrapped.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapObjectMethodsWithErrorTrackingDeprecated(object: any): void {
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
