import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wait } from "./wait.js";
import { TimeoutError } from "../errors.js";

describe("wait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should resolve immediately if initial state is terminal", async () => {
    const mockReload = vi.fn().mockResolvedValue("COMPLETED");
    const isTerminal = (status: string) => status === "COMPLETED";

    const promise = wait(mockReload, isTerminal);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe("COMPLETED");
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("should poll until terminal state is reached", async () => {
    const mockReload = vi
      .fn()
      .mockResolvedValueOnce("PENDING")
      .mockResolvedValueOnce("PROCESSING")
      .mockResolvedValue("COMPLETED");
    const isTerminal = (status: string) => status === "COMPLETED";

    const promise = wait(mockReload, isTerminal, undefined, {
      intervalSeconds: 0.01,
    });
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe("COMPLETED");
    expect(mockReload).toHaveBeenCalledTimes(3);
  });

  it("should transform the result using provided transform function", async () => {
    const mockReload = vi.fn().mockResolvedValue("COMPLETED");
    const isTerminal = (status: string) => status === "COMPLETED";
    const transform = (status: string) => ({ status });

    const promise = wait(mockReload, isTerminal, transform);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ status: "COMPLETED" });
  });

  it("should respect custom interval", async () => {
    const mockReload = vi.fn().mockResolvedValueOnce("PENDING").mockResolvedValue("COMPLETED");

    const isTerminal = (status: string) => status === "COMPLETED";

    const promise = wait(mockReload, isTerminal, undefined, { intervalSeconds: 0.5 });

    expect(mockReload).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTime(499);
    expect(mockReload).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTime(1);
    await vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();
    expect(mockReload).toHaveBeenCalledTimes(2);

    await promise;
  });

  it("should throw TimeoutError after specified timeout", async () => {
    const mockReload = vi.fn().mockResolvedValue("PENDING");
    const isTerminal = (status: string) => status === "COMPLETED";

    const promise = wait(mockReload, isTerminal, undefined, {
      timeoutSeconds: 1,
      intervalSeconds: 0.2,
    });
    promise.catch(error => {
      expect(error).toBeInstanceOf(TimeoutError);
    });

    await vi.runAllTimersAsync();

    expect(mockReload.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(mockReload.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("should handle reload function failures", async () => {
    const mockReload = vi.fn().mockRejectedValue(new Error("Network error"));
    const isTerminal = (status: string) => status === "COMPLETED";

    const promise = wait(mockReload, isTerminal);
    await expect(promise).rejects.toThrow("Network error");
  });
});
