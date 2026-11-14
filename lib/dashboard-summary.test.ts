import { describe, expect, it } from "vitest";
import { ApiError } from "./api-errors";
import {
  calculateExpenseCategoryShares,
  calculateMonthlyCashFlow,
  aggregateToDashboardSummary,
  getMonthRange,
} from "./dashboard-summary";
import type { Transaction } from "./finance";

const transactions: Transaction[] = [
  {
    id: "income-oct",
    description: "Salário",
    amountCents: 500000,
    type: "income",
    date: "2025-10-05",
    category: "Salário",
  },
  {
    id: "rent-nov",
    description: "Aluguel",
    amountCents: 180000,
    type: "expense",
    date: "2025-11-07",
    category: "Moradia",
  },
  {
    id: "food-nov",
    description: "Mercado",
    amountCents: 42000,
    type: "expense",
    date: "2025-11-12",
    category: "Alimentação",
  },
  {
    id: "income-dec",
    description: "Freelance",
    amountCents: 100000,
    type: "income",
    date: "2025-12-01",
    category: "Freelance",
  },
];

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

describe("calculateMonthlyCashFlow", () => {
  it("includes empty months and the selected month across year boundaries", () => {
    expect(calculateMonthlyCashFlow(transactions, "2025-12", 6)).toEqual([
      { month: "2025-07", incomeCents: 0, expenseCents: 0 },
      { month: "2025-08", incomeCents: 0, expenseCents: 0 },
      { month: "2025-09", incomeCents: 0, expenseCents: 0 },
      { month: "2025-10", incomeCents: 500000, expenseCents: 0 },
      { month: "2025-11", incomeCents: 0, expenseCents: 222000 },
      { month: "2025-12", incomeCents: 100000, expenseCents: 0 },
    ]);
  });
});

describe("calculateExpenseCategoryShares", () => {
  it("groups only selected-month expenses and sorts largest first", () => {
    expect(calculateExpenseCategoryShares(transactions, "2025-11")).toEqual([
      { category: "Moradia", amountCents: 180000, percentage: 180000 / 222000 * 100 },
      { category: "Alimentação", amountCents: 42000, percentage: 42000 / 222000 * 100 },
    ]);
  });

  it("returns no categories when the selected month has no expenses", () => {
    expect(calculateExpenseCategoryShares(transactions, "2025-12")).toEqual([]);
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
