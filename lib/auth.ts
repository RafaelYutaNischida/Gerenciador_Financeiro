import {
  createHash,
  randomBytes,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";

export const SESSION_COOKIE = "fintrack_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type PublicUser = {
  id: string;
  name: string;
  email: string;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await getPrisma().session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getSessionUser(request: NextRequest): Promise<PublicUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
    return null;
  }

  return session.user;
}

export async function revokeSession(request: NextRequest): Promise<void> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return;
  }

  await getPrisma().session.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
