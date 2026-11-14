import { ApiError } from "./api-errors";

export type DashboardSummary = {
  currentBalanceCents: number;
  monthlyIncomeCents: number;
  monthlyExpenseCents: number;
  monthlyBalanceCents: number;
};

export type SummaryAggregate = {
  monthlyIncome: string;
  monthlyExpense: string;
  currentIncome: string;
  currentExpense: string;
};

export function getMonthRange(month: string): {
  start: string;
  endExclusive: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new ApiError(400, "INVALID_MONTH", "Informe o mês no formato AAAA-MM.");
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year < 1 || monthNumber < 1 || monthNumber > 12) {
    throw new ApiError(400, "INVALID_MONTH", "Informe um mês válido.");
  }

  const start = `${match[1]}-${match[2]}-01`;
  const nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const endExclusive = [
    String(nextYear).padStart(4, "0"),
    String(nextMonthNumber).padStart(2, "0"),
    "01",
  ].join("-");

  return { start, endExclusive };
}

export function getTodayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data atual em São Paulo.");
  }

  return `${year}-${month}-${day}`;
}

function amountToCents(amount: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new ApiError(422, "SUMMARY_OUT_OF_RANGE", "O total financeiro excede o limite suportado.");
  }

  const wholePart = Number(match[1]);
  if (
    !Number.isSafeInteger(wholePart) ||
    wholePart > Math.floor(Number.MAX_SAFE_INTEGER / 100)
  ) {
    throw new ApiError(422, "SUMMARY_OUT_OF_RANGE", "O total financeiro excede o limite suportado.");
  }

  const fractionalPart = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = wholePart * 100 + fractionalPart;
  if (!Number.isSafeInteger(cents)) {
    throw new ApiError(422, "SUMMARY_OUT_OF_RANGE", "O total financeiro excede o limite suportado.");
  }

  return cents;
}

export function aggregateToDashboardSummary(
  aggregate: SummaryAggregate,
): DashboardSummary {
  const monthlyIncomeCents = amountToCents(aggregate.monthlyIncome);
  const monthlyExpenseCents = amountToCents(aggregate.monthlyExpense);
  const currentIncomeCents = amountToCents(aggregate.currentIncome);
  const currentExpenseCents = amountToCents(aggregate.currentExpense);

  return {
    currentBalanceCents: currentIncomeCents - currentExpenseCents,
    monthlyIncomeCents,
    monthlyExpenseCents,
    monthlyBalanceCents: monthlyIncomeCents - monthlyExpenseCents,
  };
}
