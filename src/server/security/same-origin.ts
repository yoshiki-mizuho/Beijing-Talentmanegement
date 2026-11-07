type CrossOriginWriteInput = {
  method: string;
  pathname: string;
  origin: string | null;
  host: string | null;
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function getRequestHost(
  forwardedHost: string | null,
  host: string | null
) {
  return forwardedHost?.split(",")[0]?.trim() ?? host;
}

export function isCrossOriginWrite({
  method,
  pathname,
  origin,
  host
}: CrossOriginWriteInput) {
  const isApiWrite =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !SAFE_METHODS.has(method.toUpperCase());

  if (!isApiWrite || origin === null) {
    return false;
  }

  if (origin === "null") {
    return true;
  }

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
