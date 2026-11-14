import { NextResponse, type NextRequest } from "next/server";
import {
  aggregateToDashboardSummary,
  getMonthRange,
  getTodayInSaoPaulo,
  type SummaryAggregate,
} from "@/lib/dashboard-summary";
import {
  apiErrorResponse,
  ApiError,
  unauthorizedResponse,
} from "@/lib/api-errors";
import { getSessionUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const month = request.nextUrl.searchParams.get("month");
    if (!month) {
      throw new ApiError(400, "INVALID_MONTH", "Informe o mês no formato AAAA-MM.");
    }

    const { start, endExclusive } = getMonthRange(month);
    const asOfDate = getTodayInSaoPaulo();
    const [aggregate] = await getPrisma().$queryRaw<SummaryAggregate[]>`
      SELECT
        COALESCE(
          SUM(m.amount) FILTER (
            WHERE c.type = 'income'
              AND m.movement_date >= ${start}::date
              AND m.movement_date < ${endExclusive}::date
          ),
          0
        )::text AS "monthlyIncome",
        COALESCE(
          SUM(m.amount) FILTER (
            WHERE c.type = 'expense'
              AND m.movement_date >= ${start}::date
              AND m.movement_date < ${endExclusive}::date
          ),
          0
        )::text AS "monthlyExpense",
        COALESCE(
          SUM(m.amount) FILTER (
            WHERE c.type = 'income' AND m.movement_date <= ${asOfDate}::date
          ),
          0
        )::text AS "currentIncome",
        COALESCE(
          SUM(m.amount) FILTER (
            WHERE c.type = 'expense' AND m.movement_date <= ${asOfDate}::date
          ),
          0
        )::text AS "currentExpense"
      FROM movements AS m
      JOIN categories AS c ON c.id = m.category_id
      WHERE m.user_id = ${user.id}::uuid
        AND (
          m.movement_date <= ${asOfDate}::date
          OR (
            m.movement_date >= ${start}::date
            AND m.movement_date < ${endExclusive}::date
          )
        )
    `;

    if (!aggregate) {
      throw new Error("A consulta do resumo financeiro não retornou resultados.");
    }

    return NextResponse.json({
      data: aggregateToDashboardSummary(aggregate),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
