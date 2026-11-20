export const APP_PATH_PREFIX = "/talent" as const;
export const API_PATH_PREFIX = "/api/talent/v1" as const;

export function appPath(path = ""): string {
  return `${APP_PATH_PREFIX}${normalizePath(path)}`;
}

export function apiPath(path = ""): string {
  return `${API_PATH_PREFIX}${normalizePath(path)}`;
}

function normalizePath(path: string): string {
  if (!path || path === "/") {
    return "";
  }

  return path.startsWith("/") ? path : `/${path}`;
}
