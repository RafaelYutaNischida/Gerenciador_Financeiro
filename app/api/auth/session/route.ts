import type { NextRequest } from "next/server";
import { apiErrorResponse, unauthorizedResponse } from "@/lib/api-errors";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    return Response.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
