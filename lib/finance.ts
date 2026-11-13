export type MovementType = "income" | "expense";

export type Transaction = {
  id: string;
  description: string;
  amountCents: number;
  type: MovementType;
  date: string;
  category: string;
};

export type FinanceSummary = {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
};

export function parseAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    return null;
  }

  const wholePart = Number(match[1]);
  const decimalPart = Number((match[2] ?? "").padEnd(2, "0"));

  if (!Number.isSafeInteger(wholePart)) {
    return null;
  }

  const cents = wholePart * 100 + decimalPart;
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function calculateSummary(
  transactions: Transaction[],
): FinanceSummary {
  const incomeCents = transactions.reduce(
    (total, transaction) =>
      transaction.type === "income" ? total + transaction.amountCents : total,
    0,
  );
  const expenseCents = transactions.reduce(
    (total, transaction) =>
      transaction.type === "expense" ? total + transaction.amountCents : total,
    0,
  );

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
  };
}

export function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
