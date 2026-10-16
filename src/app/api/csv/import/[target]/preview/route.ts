import { NextResponse } from "next/server";
import {
  csvImportErrorMessage,
  isCsvSizeError,
  previewCsvImport,
} from "@/modules/csv-import/application/csv-import-service";
import { isCsvImportTarget } from "@/modules/csv-import/domain/csv-import-columns";
import { adminOnly, authorizeApi } from "@/server/auth/authorization";

export async function POST(
  request: Request,
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
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    return NextResponse.json(await previewCsvImport(target, bytes));
  } catch (error) {
    return NextResponse.json(
      { error: csvImportErrorMessage(error) },
      { status: isCsvSizeError(error) ? 413 : 400 },
    );
  }
}
