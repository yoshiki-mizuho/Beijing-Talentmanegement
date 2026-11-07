const fallbackFileName = "不明なファイル";

export function sanitizeImportFileName(encodedFileName: string | null) {
  let decodedFileName: string;
  try {
    decodedFileName = decodeURIComponent(encodedFileName ?? "import.csv");
  } catch {
    return fallbackFileName;
  }

  return decodedFileName
    .replace(/[\u0000-\u001f\u007f-\u009f/\\]/g, "")
    .slice(0, 255);
}
