import { Prisma } from "@/generated/prisma/client";
import type { MovementType } from "@/generated/prisma/enums";
import type { Transaction } from "@/lib/finance";
import type { MovementInput } from "@/lib/movement-validation";

type MovementWithCategory = {
  id: string;
  description: string;
  amount: { toFixed: (decimalPlaces: number) => string };
  movementDate: Date;
  notes: string | null;
  category: {
    name: string;
    type: MovementType;
  };
};

export function movementToTransaction(movement: MovementWithCategory): Transaction {
  const [whole, fraction] = movement.amount.toFixed(2).split(".");

  return {
    id: movement.id,
    description: movement.description,
    amountCents: Number(whole) * 100 + Number(fraction),
    type: movement.category.type === "INCOME" ? "income" : "expense",
    date: movement.movementDate.toISOString().slice(0, 10),
    category: movement.category.name,
    notes: movement.notes ?? "",
  };
}

export function movementToPersistenceData(input: MovementInput, categoryId: string) {
  const amount =
    `${Math.floor(input.amountCents / 100)}.` +
    String(input.amountCents % 100).padStart(2, "0");

  return {
    categoryId,
    description: input.description,
    amount: new Prisma.Decimal(amount),
    movementDate: new Date(`${input.date}T00:00:00.000Z`),
    notes: input.notes,
  };
}
