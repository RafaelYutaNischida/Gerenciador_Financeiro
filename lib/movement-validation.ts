import { ApiError, requireRecord } from "./api-errors";

export type MovementInput = {
  description: string;
  amountCents: number;
  type: "income" | "expense";
  date: string;
  category: string;
  notes: string | null;
};

const MAX_AMOUNT_CENTS = 999_999_999_999;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateMovementInput(value: unknown): MovementInput {
  const body = requireRecord(value);
  const details: Record<string, string> = {};

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description || description.length > 120) {
    details.description = "A descrição é obrigatória e deve ter até 120 caracteres.";
  }

  const amountCents =
    typeof body.amountCents === "number" ? body.amountCents : Number.NaN;
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_AMOUNT_CENTS
  ) {
    details.amountCents = "Informe um valor positivo válido, com até duas casas decimais.";
  }

  const type = body.type === "income" ? "income" : "expense";
  if (body.type !== "income" && body.type !== "expense") {
    details.type = "O tipo deve ser receita ou despesa.";
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!isValidDate(date)) {
    details.date = "Informe uma data válida no formato AAAA-MM-DD.";
  }

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!category || category.length > 60) {
    details.category = "Selecione uma categoria válida.";
  }

  let notes: string | null = null;
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string" || body.notes.length > 500) {
      details.notes = "A observação deve ter até 500 caracteres.";
    } else {
      notes = body.notes.trim() || null;
    }
  }

  if (Object.keys(details).length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Revise os dados informados.", details);
  }

  return {
    description,
    amountCents,
    type,
    date,
    category,
    notes,
  };
}
