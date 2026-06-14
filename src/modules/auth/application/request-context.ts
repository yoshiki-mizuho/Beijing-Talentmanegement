function getHeaderValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function getClientIp(headers: unknown) {
  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return getHeaderValue(headers, "x-real-ip") ?? "unknown";
}
