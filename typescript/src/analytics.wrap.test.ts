import { describe, it, expect, vi, beforeEach } from "vitest";
import { Analytics } from "./analytics.js";
import { NetworkError } from "./openapi-client/errors.js";

/**
 * This test file specifically tests edge cases related to wrapping methods with error tracking.
 *
 * THE BUG:
 * When a method calls itself via ClassName.prototype[methodName] or object[method], wrapping creates
 * infinite recursion because the wrapper replaces the prototype/object property, so the original method's
 * self-reference now points to the wrapper, creating a loop: wrapper -> originalMethod -> prototype[method] (wrapper) -> ...
 * This occurs even though the implementation correctly captures originalMethod before assignment, because
 * the original method itself accesses the prototype/object property which has been replaced by the wrapper.
 *
 * TEST CASES:
 * 1. Bug reproduction: Two tests verify that methods calling via prototype/object cause "Maximum call stack size exceeded"
 * 2. Double-wrapping behavior: Three tests verify that multiple wraps create deeper wrapper chains but normal methods still work
 * 3. Normal operation: Three tests verify that methods not calling via prototype work correctly after wrapping
 */

describe("Edge Case: Methods calling themselves via ClassName.prototype[methodName] cause stack overflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("REPRODUCES THE BUG: method calling ClassName.prototype[method] causes stack overflow", async () => {
    class TestClass {
      async testMethod(value: number): Promise<number> {
        // EDGE CASE: Method calls itself via prototype
        // After wrapping, TestClass.prototype.testMethod is the wrapper,
        // causing infinite recursion when the original method executes
        return await TestClass.prototype.testMethod.call(this, value);
      }
    }

    Analytics.wrapClassWithErrorTracking(TestClass);
    const instance = new TestClass();

    // This causes "Maximum call stack size exceeded" because:
    // 1. instance.testMethod() calls the wrapper
    // 2. Wrapper calls originalMethod.apply(this, args)
    // 3. originalMethod calls TestClass.prototype.testMethod.call(this, value)
    // 4. TestClass.prototype.testMethod is now the wrapper (from step 1)
    // 5. Infinite recursion: wrapper -> originalMethod -> prototype.testMethod (wrapper) -> ...
    await expect(instance.testMethod(5)).rejects.toThrow("Maximum call stack size exceeded");
  });

  it("REPRODUCES THE BUG: object method calling itself via object[method] causes stack overflow", async () => {
    const testObject = {
      async testMethod(value: number): Promise<number> {
        // EDGE CASE: Method calls itself via object property access
        // After wrapping, testObject.testMethod is the wrapper,
        // causing infinite recursion when the original method executes
        return await testObject.testMethod(value);
      },
    };

    Analytics.wrapObjectMethodsWithErrorTracking(testObject);

    // This causes stack overflow for the same reason as the class prototype case
    await expect(testObject.testMethod(4)).rejects.toThrow("Maximum call stack size exceeded");
  });
});

describe("Double-wrapping behavior: Creates deeper wrapper chains but normal methods still work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("should allow double-wrapping of classes - creates deeper wrapper chains", async () => {
    class TestClass {
      async testMethod(value: number): Promise<number> {
        return value * 2;
      }
    }

    // Wrap multiple times - current implementation allows this and creates deeper wrapper chains
    // Each wrap captures the previous wrapper as originalMethod, creating: wrapper3 -> wrapper2 -> wrapper1 -> original
    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass);

    const instance = new TestClass();

    // Normal methods still work correctly despite deeper wrapper chains
    // The implementation captures originalMethod before assignment, so it works
    const result = await instance.testMethod(5);
    expect(result).toBe(10);
  });

  it("should allow double-wrapping of objects - creates deeper wrapper chains", async () => {
    const testObject = {
      async testMethod(value: number): Promise<number> {
        return value * 3;
      },
    };

    // Wrap multiple times - current implementation allows this and creates deeper wrapper chains
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);

    // Normal methods still work correctly despite deeper wrapper chains
    const result = await testObject.testMethod(4);
    expect(result).toBe(12);
  });

  it("should handle rapid successive wraps - creates many wrapper layers", async () => {
    class TestClass {
      async testMethod(): Promise<string> {
        return "test";
      }
    }

    // Rapid successive wraps - each creates another wrapper layer
    // Current implementation has no protection, so all wraps execute
    for (let i = 0; i < 10; i++) {
      Analytics.wrapClassWithErrorTracking(TestClass);
    }

    const instance = new TestClass();
    // Still works, but has 10 wrapper layers: wrapper10 -> wrapper9 -> ... -> wrapper1 -> original
    const result = await instance.testMethod();
    expect(result).toBe("test");
  });
});

describe("Normal operation: Methods that don't call via prototype work correctly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("should wrap normal methods without issues", async () => {
    class TestClass {
      async testMethod(value: number): Promise<number> {
        return value * 2;
      }

      async anotherMethod(value: string): Promise<string> {
        return `Hello ${value}`;
      }
    }

    Analytics.wrapClassWithErrorTracking(TestClass);
    const instance = new TestClass();

    const result1 = await instance.testMethod(5);
    expect(result1).toBe(10);

    const result2 = await instance.anotherMethod("World");
    expect(result2).toBe("Hello World");
  });

  it("should track errors correctly in wrapped methods", async () => {
    class TestClass {
      async failingMethod(): Promise<never> {
        throw new NetworkError("network_connection_failed", "Test network error", {
          code: "NETWORK_ERROR",
          retryable: false,
        });
      }
    }

    Analytics.wrapClassWithErrorTracking(TestClass);
    const instance = new TestClass();

    await expect(instance.failingMethod()).rejects.toThrow(NetworkError);

    // Give a moment for async error tracking
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fetch).toHaveBeenCalled();
  });

  it("should preserve method context correctly", async () => {
    const testObject = {
      value: 42,

      async getValue(): Promise<number> {
        return this.value;
      },
    };

    Analytics.wrapObjectMethodsWithErrorTracking(testObject);

    const result = await testObject.getValue();
    expect(result).toBe(42);
  });
});
