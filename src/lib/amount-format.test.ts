import { describe, expect, it } from "vitest";
import { amountToChineseUppercase, formatAmountWithCommas, parseAmountInput } from "./amount-format";

describe("amount-format", () => {
  it("parses comma-separated input", () => {
    expect(parseAmountInput("50,000")).toBe(50000);
    expect(parseAmountInput("1234.56")).toBe(1234.56);
  });

  it("formats amount with commas", () => {
    expect(formatAmountWithCommas(50000)).toBe("50,000");
    expect(formatAmountWithCommas(1234.5)).toBe("1,234.5");
  });

  it("converts amount to chinese uppercase", () => {
    expect(amountToChineseUppercase(50000)).toBe("伍万元整");
    expect(amountToChineseUppercase(1234.56)).toBe("壹仟贰佰叁拾肆元伍角陆分");
  });
});
