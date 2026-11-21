const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function apiClient(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (WRITE_METHODS.has(method) && !headers.has("X-CSRF-Token")) {
    const csrfToken = readCookie("csrf_token");
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    window.location.assign(loginUrl);
  }

  return response;
}

export async function downloadApiFile(url: string): Promise<Response> {
  const response = await apiClient(url);
  if (!response.ok) {
    return response;
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const download = document.createElement("a");
  download.href = objectUrl;
  download.download = getDownloadFilename(response.headers) ?? "download";
  download.click();
  URL.revokeObjectURL(objectUrl);
  return response;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((candidate) => candidate.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

function getDownloadFilename(headers: Headers): string | undefined {
  const contentDisposition = headers.get("Content-Disposition");
  const encodedFilename = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedFilename) {
    return decodeURIComponent(encodedFilename);
  }

  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
}
