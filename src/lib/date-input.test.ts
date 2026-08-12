import { describe, expect, it } from "vitest";
import { tryParseDateInputValue, toDateInputValue } from "./utils";

describe("date input utils", () => {
  it("parses common manual formats", () => {
    expect(toDateInputValue(tryParseDateInputValue("2025-07-22")!)).toBe(
      "2025-07-22",
    );
    expect(toDateInputValue(tryParseDateInputValue("2025/7/22")!)).toBe(
      "2025-07-22",
    );
    expect(toDateInputValue(tryParseDateInputValue("2025.07.22")!)).toBe(
      "2025-07-22",
    );
  });

  it("returns null for incomplete input", () => {
    expect(tryParseDateInputValue("2025-07")).toBeNull();
    expect(tryParseDateInputValue("2025/7/")).toBeNull();
  });
});
