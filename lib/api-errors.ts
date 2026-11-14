import { NextResponse } from "next/server";

type ErrorDetails = Record<string, string>;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function logApiError(message: string, error: unknown): void {
  console.error(message, {
    name: error instanceof Error ? error.name : typeof error,
    code: errorCode(error),
  });
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  const prismaCode = errorCode(error);
  if (prismaCode === "P2002") {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Este registro já existe." } },
      { status: 409 },
    );
  }
  if (prismaCode === "P2025") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Movimentação não encontrada." } },
      { status: 404 },
    );
  }
  if (prismaCode === "P2003") {
    return NextResponse.json(
      { error: { code: "INVALID_REFERENCE", message: "A categoria informada é inválida." } },
      { status: 400 },
    );
  }
  if (
    prismaCode === "P1000" ||
    prismaCode === "P1001" ||
    prismaCode === "P1002" ||
    prismaCode === "P1013" ||
    prismaCode === "P1017"
  ) {
    logApiError("Database connection failed", error);
    return NextResponse.json(
      { error: { code: "DATABASE_UNAVAILABLE", message: "Não foi possível acessar o banco de dados." } },
      { status: 503 },
    );
  }

  logApiError("Unhandled API error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro interno." } },
    { status: 500 },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (contentType !== "application/json") {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados no formato JSON.");
  }

  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "O corpo da requisição não contém JSON válido.");
  }
}

export function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_BODY", "O corpo da requisição deve ser um objeto JSON.");
  }
  return value as Record<string, unknown>;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Faça login para continuar." } },
    { status: 401 },
  );
}
