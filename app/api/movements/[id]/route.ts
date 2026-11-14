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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function assertMovementId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(404, "NOT_FOUND", "Movimentação não encontrada.");
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    assertMovementId(id);
    const movement = await getPrisma().movement.findFirst({
      where: { id, userId: user.id },
      include: { category: true },
    });
    if (!movement) {
      throw new ApiError(404, "NOT_FOUND", "Movimentação não encontrada.");
    }

    return NextResponse.json({ data: movementToTransaction(movement) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    assertMovementId(id);
    const input = validateMovementInput(await readJsonBody(request));
    const movementType =
      input.type === "income" ? MovementType.INCOME : MovementType.EXPENSE;
    const category = await getPrisma().category.findUnique({
      where: { name_type: { name: input.category, type: movementType } },
    });
    if (!category) {
      throw new ApiError(400, "INVALID_CATEGORY", "Selecione uma categoria válida.");
    }

    const movement = await getPrisma().movement.update({
      where: { id, userId: user.id },
      data: movementToPersistenceData(input, category.id),
      include: { category: true },
    });

    return NextResponse.json({ data: movementToTransaction(movement) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    assertMovementId(id);
    await getPrisma().movement.delete({
      where: { id, userId: user.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
