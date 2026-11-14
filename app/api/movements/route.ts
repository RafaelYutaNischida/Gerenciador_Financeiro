import { NextResponse, type NextRequest } from "next/server";
import { MovementType } from "@/generated/prisma/client";
import {
  apiErrorResponse,
  ApiError,
  readJsonBody,
  unauthorizedResponse,
} from "@/lib/api-errors";
import { getSessionUser } from "@/lib/auth";
import {
  movementToPersistenceData,
  movementToTransaction,
} from "@/lib/movement-dto";
import { validateMovementInput } from "@/lib/movement-validation";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const movements = await getPrisma().movement.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: movements.map(movementToTransaction) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const input = validateMovementInput(await readJsonBody(request));
    const movementType =
      input.type === "income" ? MovementType.INCOME : MovementType.EXPENSE;
    const category = await getPrisma().category.findUnique({
      where: { name_type: { name: input.category, type: movementType } },
    });
    if (!category) {
      throw new ApiError(400, "INVALID_CATEGORY", "Selecione uma categoria válida.");
    }

    const movement = await getPrisma().movement.create({
      data: {
        userId: user.id,
        ...movementToPersistenceData(input, category.id),
      },
      include: { category: true },
    });

    return NextResponse.json(
      { data: movementToTransaction(movement) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
