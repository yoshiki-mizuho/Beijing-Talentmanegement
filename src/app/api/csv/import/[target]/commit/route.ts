import { NextResponse } from "next/server";
import {
  commitCsvImport,
  csvImportErrorMessage,
  isCsvSizeError,
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
  const previewToken = request.headers.get("x-preview-token") ?? "";
  const originalName = decodeURIComponent(
    request.headers.get("x-file-name") ?? "import.csv",
  );
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    const result = await commitCsvImport({
      target,
      bytes,
      previewToken,
      originalName,
      actorMemberId: auth.session.user.memberId,
    });
    if (result.status === "conflict") {
      return NextResponse.json(
        { error: "データが変わったため、確認し直してください" },
        { status: 409 },
      );
    }
    if (result.status === "invalid") {
      return NextResponse.json(result.preview, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: csvImportErrorMessage(error) },
      { status: isCsvSizeError(error) ? 413 : 500 },
    );
  }
}
