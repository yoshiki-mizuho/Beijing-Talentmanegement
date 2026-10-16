import { NextResponse } from "next/server";
import { csvExportDefinitions } from "@/modules/csv-import/domain/csv-export-columns";
import { isCsvImportTarget } from "@/modules/csv-import/domain/csv-import-columns";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";
import { buildCsv } from "@/shared/lib/csv";

export async function GET(
  _request: Request,
  context: { params: Promise<{ target: string }> },
) {
  const auth = await authorizeApi(adminOnly);
  if ("response" in auth) {
    return auth.response;
  }
  const { target } = await context.params;
  if (!isCsvImportTarget(target)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return new NextResponse(
    buildCsv([...csvExportDefinitions[target].columns], []),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${target}-template.csv"`,
      },
    },
  );
}
