import { describe, it, expect, vi, beforeEach } from "vitest";
import { Analytics } from "./analytics.js";
import { NetworkError } from "./openapi-client/errors.js";

describe("wrapClassWithErrorTracking - double wrapping prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("should not cause infinite recursion when wrapping a class multiple times", async () => {
    class TestClass {
      async testMethod(value: number): Promise<number> {
        return value * 2;
      }

      async anotherMethod(value: string): Promise<string> {
        return `Hello ${value}`;
      }
    }

    // Wrap multiple times - this should not cause infinite recursion
    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass);

    const instance = new TestClass();

    // Call methods - should work correctly without stack overflow
    const result1 = await instance.testMethod(5);
    expect(result1).toBe(10);

    const result2 = await instance.anotherMethod("World");
    expect(result2).toBe("Hello World");
  });

  it("should track errors correctly after multiple wraps", async () => {
    class TestClass {
      async failingMethod(): Promise<never> {
        throw new NetworkError("network_connection_failed", "Test network error", {
          code: "NETWORK_ERROR",
          retryable: false,
        });
      }
    }

    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass); // Wrap again

    const instance = new TestClass();

    await expect(instance.failingMethod()).rejects.toThrow(NetworkError);

    // Give a moment for async error tracking
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fetch).toHaveBeenCalled();
  });

  it("should handle rapid successive wraps without issues", () => {
    class TestClass {
      async testMethod(): Promise<string> {
        return "test";
      }
    }

    // Rapid successive wraps
    for (let i = 0; i < 10; i++) {
      Analytics.wrapClassWithErrorTracking(TestClass);
    }

    const instance = new TestClass();
    expect(instance).toBeDefined();
  });
});

describe("wrapObjectMethodsWithErrorTracking - double wrapping prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("should not cause infinite recursion when wrapping an object multiple times", async () => {
    const testObject = {
      async testMethod(value: number): Promise<number> {
        return value * 3;
      },

      async anotherMethod(value: string): Promise<string> {
        return `Hi ${value}`;
      },
    };

    // Wrap multiple times - should not cause infinite recursion
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);

    // Call methods - should work correctly without stack overflow
    const result1 = await testObject.testMethod(4);
    expect(result1).toBe(12);

    const result2 = await testObject.anotherMethod("Test");
    expect(result2).toBe("Hi Test");
  });

  it("should track errors correctly after multiple wraps", async () => {
    const testObject = {
      async failingMethod(): Promise<never> {
        throw new NetworkError("network_connection_failed", "Test error", {
          code: "ERROR",
          retryable: false,
        });
      },
    };

    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject); // Wrap again

    await expect(testObject.failingMethod()).rejects.toThrow(NetworkError);

    // Give a moment for async error tracking
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fetch).toHaveBeenCalled();
  });

  it("should handle rapid successive wraps without issues", async () => {
    const testObject = {
      async testMethod(): Promise<string> {
        return "success";
      },
    };

    // Rapid successive wraps
    for (let i = 0; i < 10; i++) {
      Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    }

    const result = await testObject.testMethod();
    expect(result).toBe("success");
  });

  it("should preserve method context correctly after multiple wraps", async () => {
    const testObject = {
      value: 42,

      async getValue(): Promise<number> {
        return this.value;
      },
    };

    Analytics.wrapObjectMethodsWithErrorTracking(testObject);
    Analytics.wrapObjectMethodsWithErrorTracking(testObject);

    const result = await testObject.getValue();
    expect(result).toBe(42);
  });
});

describe("Performance benchmark - wrapping prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  it("should complete wrapping quickly even with many iterations", () => {
    class TestClass {
      async method1(): Promise<void> {}
      async method2(): Promise<void> {}
      async method3(): Promise<void> {}
    }

    const start = performance.now();

    // Wrap many times
    for (let i = 0; i < 100; i++) {
      Analytics.wrapClassWithErrorTracking(TestClass);
    }

    const end = performance.now();
    const duration = end - start;

    // Should complete quickly (less than 100ms) since subsequent wraps are no-ops
    expect(duration).toBeLessThan(100);
  });

  it("should handle deep call stacks without overflow", async () => {
    class TestClass {
      async recursiveMethod(depth: number): Promise<number> {
        if (depth === 0) {
          return 0;
        }
        return 1 + (await this.recursiveMethod(depth - 1));
      }
    }

    Analytics.wrapClassWithErrorTracking(TestClass);
    Analytics.wrapClassWithErrorTracking(TestClass); // Double wrap

    const instance = new TestClass();

    // Deep recursion should work fine
    const result = await instance.recursiveMethod(50);
    expect(result).toBe(50);
  });
});

describe("Memory leak prevention - comparing buggy vs fixed implementation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    Analytics.identifier = "test-id";
  });

  /**
   * OLD BUGGY IMPLEMENTATION: Wraps a class WITHOUT protection flags.
   * This reproduces the bug: the wrapper calls the prototype method directly,
   * which after assignment is the wrapper itself, causing infinite recursion.
   */
  function wrapClassBuggyOld(ClassToWrap: any): void {
    const methods = Object.getOwnPropertyNames(ClassToWrap.prototype).filter(
      (name): name is string =>
        name !== "constructor" && typeof ClassToWrap.prototype[name] === "function",
    );

    for (const method of methods) {
      // BUG: No check for __wrapped__ flag - allows double wrapping
      // BUG: Calls ClassToWrap.prototype[method] directly, which is now this wrapper
      ClassToWrap.prototype[method] = async function (...args: unknown[]) {
        // This causes infinite recursion: wrapper -> prototype[method] -> wrapper -> ...
        return await (ClassToWrap.prototype[method] as any).apply(this, args);
      };
    }
  }

  /**
   * OLD BUGGY IMPLEMENTATION: Wraps an object WITHOUT protection flags.
   * Same bug: calls object[method] after assignment, which is the wrapper itself.
   */
  function wrapObjectBuggyOld(object: any): void {
    const methods = Object.getOwnPropertyNames(object).filter(
      (name): name is string => name !== "constructor" && typeof object[name] === "function",
    );

    for (const method of methods) {
      // BUG: No check for __wrapped__ flag - allows double wrapping
      // BUG: Calls object[method] directly, which is now this wrapper
      object[method] = async function (...args: unknown[]) {
        // This causes infinite recursion: wrapper -> object[method] -> wrapper -> ...
        return await (object[method] as any).apply(this, args);
      };
    }
  }

  describe("OLD buggy implementation - causes stack overflow", () => {
    it("should cause stack overflow when wrapping a class (buggy implementation)", async () => {
      class TestClass {
        async testMethod(value: number): Promise<number> {
          return value * 2;
        }
      }

      // OLD BUGGY: No protection flags, calls prototype method directly
      wrapClassBuggyOld(TestClass);

      const instance = new TestClass();

      // This causes "Maximum call stack size exceeded" because:
      // 1. testMethod is now a wrapper that calls ClassToWrap.prototype[method]
      // 2. ClassToWrap.prototype[method] IS the wrapper itself
      // 3. Infinite recursion: wrapper -> prototype[method] -> wrapper -> ...
      await expect(instance.testMethod(5)).rejects.toThrow("Maximum call stack size exceeded");
    });

    it("should cause stack overflow when wrapping an object (buggy implementation)", async () => {
      const testObject = {
        async testMethod(value: number): Promise<number> {
          return value * 3;
        },
      };

      // OLD BUGGY: No protection flags, calls object[method] directly
      wrapObjectBuggyOld(testObject);

      // This causes stack overflow
      await expect(testObject.testMethod(4)).rejects.toThrow("Maximum call stack size exceeded");
    });

    it("should demonstrate the recursive call pattern that causes the leak", async () => {
      class TestClass {
        async simpleMethod(): Promise<string> {
          return "original";
        }
      }

      // OLD BUGGY: Wrapper calls ClassToWrap.prototype[method] directly
      wrapClassBuggyOld(TestClass);

      const instance = new TestClass();

      // The call chain is:
      // instance.simpleMethod() 
      //   -> wrapper (calls ClassToWrap.prototype[method].apply)
      //     -> wrapper (calls ClassToWrap.prototype[method].apply, which is itself)
      //       -> wrapper (calls ClassToWrap.prototype[method].apply, which is itself)
      //         -> ... infinite recursion -> Maximum call stack size exceeded
      await expect(instance.simpleMethod()).rejects.toThrow("Maximum call stack size exceeded");
    });
  });

  describe("NEW fixed implementation - prevents stack overflow", () => {
    it("should NOT cause stack overflow when wrapping a class multiple times (fixed implementation)", async () => {
      class TestClass {
        async testMethod(value: number): Promise<number> {
          return value * 2;
        }

        async anotherMethod(value: string): Promise<string> {
          return `Hello ${value}`;
        }
      }

      // NEW FIXED: Uses __cdp_wrapped__ flag to prevent double wrapping
      // Uses captured originalMethod reference instead of calling prototype directly
      Analytics.wrapClassWithErrorTracking(TestClass);
      Analytics.wrapClassWithErrorTracking(TestClass); // Second wrap is prevented
      Analytics.wrapClassWithErrorTracking(TestClass); // Third wrap is prevented

      const instance = new TestClass();

      // Should work correctly without stack overflow
      const result1 = await instance.testMethod(5);
      expect(result1).toBe(10);

      const result2 = await instance.anotherMethod("World");
      expect(result2).toBe("Hello World");
    });

    it("should NOT cause stack overflow when wrapping an object multiple times (fixed implementation)", async () => {
      const testObject = {
        async testMethod(value: number): Promise<number> {
          return value * 3;
        },

        async anotherMethod(value: string): Promise<string> {
          return `Hi ${value}`;
        },
      };

      // NEW FIXED: Uses __wrapped__ flag to prevent double wrapping
      // Uses captured originalMethod reference instead of calling object[method] directly
      Analytics.wrapObjectMethodsWithErrorTracking(testObject);
      Analytics.wrapObjectMethodsWithErrorTracking(testObject); // Second wrap is prevented
      Analytics.wrapObjectMethodsWithErrorTracking(testObject); // Third wrap is prevented

      // Should work correctly without stack overflow
      const result1 = await testObject.testMethod(4);
      expect(result1).toBe(12);

      const result2 = await testObject.anotherMethod("Test");
      expect(result2).toBe("Hi Test");
    });

    it("should preserve original method behavior after multiple wraps (fixed implementation)", async () => {
      class TestClass {
        async simpleMethod(): Promise<string> {
          return "original";
        }
      }

      // NEW FIXED: Multiple wraps are prevented, original method is preserved
      Analytics.wrapClassWithErrorTracking(TestClass);
      Analytics.wrapClassWithErrorTracking(TestClass); // Prevented by __cdp_wrapped__ flag

      const instance = new TestClass();

      // Should return the original value, not cause stack overflow
      const result = await instance.simpleMethod();
      expect(result).toBe("original");
    });

    it("should handle rapid successive wraps without stack overflow (fixed implementation)", async () => {
      const testObject = {
        async getValue(): Promise<number> {
          return 42;
        },
      };

      // NEW FIXED: Rapid successive wraps are prevented by __wrapped__ flag
      for (let i = 0; i < 10; i++) {
        Analytics.wrapObjectMethodsWithErrorTracking(testObject);
      }

      // Should work correctly without stack overflow
      const result = await testObject.getValue();
      expect(result).toBe(42);
    });
  });
});

