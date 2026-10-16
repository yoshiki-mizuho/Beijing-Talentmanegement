import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { exportAuditLogs } from "@/modules/audit/application/audit-log-service";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function GET(request: NextRequest) {
  const auth = await authorizeApi(adminOnly);
  if ("response" in auth) {
    return auth.response;
  }
  try {
    const input = searchParamsInput(request.nextUrl.searchParams);
    const csv = await exportAuditLogs(input, auth.session.user.memberId);
    if (csv === null) {
      return NextResponse.json(
        { error: "件数が10,000件を超えています。期間を絞ってください。" },
        { status: 400 },
      );
    }
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" })
      .format(new Date())
      .replaceAll("-", "");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${date}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "絞り込み条件が不正です。" },
        { status: 400 },
      );
    }
    throw error;
  }
}

function searchParamsInput(searchParams: URLSearchParams) {
  const input: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams) {
    const current = input[key];
    if (current === undefined) {
      input[key] = value;
    } else if (Array.isArray(current)) {
      input[key] = [...current, value];
    } else {
      input[key] = [current, value];
    }
  }
  return input;
}
