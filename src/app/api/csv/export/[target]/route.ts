import { NextResponse } from "next/server";
import { exportCsv } from "@/modules/csv-import/application/csv-export-service";
import {
  isCsvExportTarget,
  type CsvExportScope,
} from "@/modules/csv-import/domain/csv-export-columns";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function GET(
  request: Request,
  context: { params: Promise<{ target: string }> },
) {
  const auth = await authorizeApi(adminOnly);
  if ("response" in auth) {
    return auth.response;
  }
  const { target } = await context.params;
  if (!isCsvExportTarget(target)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  const scope = getScope(new URL(request.url).searchParams.get("scope"));
  const csv = await exportCsv(target, scope, auth.session.user.memberId);
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" })
    .format(new Date())
    .replaceAll("-", "");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${target}-${date}.csv"`,
    },
  });
}

function getScope(value: string | null): CsvExportScope {
  return value === "all" ? "all" : "active";
}
