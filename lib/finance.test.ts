import { describe, expect, it } from "vitest";
import {
  calculateSummary,
  parseAmountToCents,
  type Transaction,
} from "./finance";

describe("parseAmountToCents", () => {
  it("parses decimal values with dot or comma", () => {
    expect(parseAmountToCents("125.40")).toBe(12540);
    expect(parseAmountToCents("125,4")).toBe(12540);
  });

  it("rejects zero, negative, malformed, and over-precise values", () => {
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("-12")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
  });
});

describe("calculateSummary", () => {
  it("calculates totals and a net balance using integer cents", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        description: "Salário",
        amountCents: 520000,
        type: "income",
        date: "2026-11-05",
        category: "Salário",
      },
      {
        id: "2",
        description: "Aluguel",
        amountCents: 180000,
        type: "expense",
        date: "2026-11-07",
        category: "Moradia",
      },
    ];

    expect(calculateSummary(transactions)).toEqual({
      incomeCents: 520000,
      expenseCents: 180000,
      balanceCents: 340000,
    });
  });
});
