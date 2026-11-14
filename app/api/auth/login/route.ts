import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  ApiError,
  readJsonBody,
  requireRecord,
} from "@/lib/api-errors";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = requireRecord(await readJsonBody(request));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || email.length > 254 || !password || password.length > 128) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Informe um e-mail válido e uma senha.",
      );
    }

    const user = await getPrisma().user.findUnique({
      where: { email },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
