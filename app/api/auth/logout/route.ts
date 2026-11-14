import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { clearSessionCookie, revokeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await revokeSession(request);
    const response = new NextResponse(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
