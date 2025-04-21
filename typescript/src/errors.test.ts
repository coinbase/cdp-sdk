import { describe, it, expect } from "vitest";
import { TimeoutError } from "./errors.js";

describe("TimeoutError", () => {
  it("should create an error with default message", () => {
    const error = new TimeoutError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe("Timeout Error");
    expect(error.name).toBe("TimeoutError");
  });

  it("should create an error with custom message", () => {
    const customMessage = "Operation timed out after 5000ms";
    const error = new TimeoutError(customMessage);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe(customMessage);
    expect(error.name).toBe("TimeoutError");
  });

  it("should capture stack trace", () => {
    const error = new TimeoutError();
    expect(error.stack).toBeDefined();
  });
});
