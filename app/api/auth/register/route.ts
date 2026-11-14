import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  ApiError,
  readJsonBody,
  requireRecord,
} from "@/lib/api-errors";
import { createSession, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = requireRecord(await readJsonBody(request));
    const details: Record<string, string> = {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 100) {
      details.name = "Informe um nome com até 100 caracteres.";
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      details.email = "Informe um e-mail válido.";
    }
    if (password.length < 8 || password.length > 128) {
      details.password = "A senha deve ter entre 8 e 128 caracteres.";
    }
    if (Object.keys(details).length > 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Revise os dados informados.", details);
    }

    const prisma = getPrisma();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
      },
      select: { id: true, name: true, email: true },
    });
    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
