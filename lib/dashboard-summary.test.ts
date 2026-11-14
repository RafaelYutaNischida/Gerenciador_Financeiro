import { describe, expect, it } from "vitest";
import { ApiError } from "./api-errors";
import {
  aggregateToDashboardSummary,
  getMonthRange,
} from "./dashboard-summary";

describe("getMonthRange", () => {
  it("returns an inclusive start and exclusive start of the next month", () => {
    expect(getMonthRange("2024-02")).toEqual({
      start: "2024-02-01",
      endExclusive: "2024-03-01",
    });
    expect(getMonthRange("2026-12")).toEqual({
      start: "2026-12-01",
      endExclusive: "2027-01-01",
    });
  });

  it("rejects malformed or out-of-range months", () => {
    expect(() => getMonthRange("2026-13")).toThrow(ApiError);
    expect(() => getMonthRange("2026-2")).toThrow(ApiError);
    expect(() => getMonthRange("0000-01")).toThrow(ApiError);
  });
});

describe("aggregateToDashboardSummary", () => {
  it("keeps month totals distinct from the balance accumulated through today", () => {
    expect(
      aggregateToDashboardSummary({
        monthlyIncome: "5200.15",
        monthlyExpense: "1800.25",
        currentIncome: "10000.40",
        currentExpense: "5500.10",
      }),
    ).toEqual({
      currentBalanceCents: 450030,
      monthlyIncomeCents: 520015,
      monthlyExpenseCents: 180025,
      monthlyBalanceCents: 339990,
    });
  });

  it("rejects totals that cannot be represented exactly in integer cents", () => {
    expect(() =>
      aggregateToDashboardSummary({
        monthlyIncome: "90071992547409.92",
        monthlyExpense: "0",
        currentIncome: "0",
        currentExpense: "0",
      }),
    ).toThrow(ApiError);
  });
});
