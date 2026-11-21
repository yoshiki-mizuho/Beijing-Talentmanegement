import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./api-client";

const fetchMock = vi.fn();
const assignMock = vi.fn();

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "" });
    vi.stubGlobal("window", {
      location: {
        origin: "https://example.test",
        pathname: "/talent/members",
        search: "?page=2",
        assign: assignMock
      }
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "%sではCookieのCSRFトークンをヘッダに付ける",
    async (method) => {
      vi.stubGlobal("document", { cookie: "other=value; csrf_token=token%2Fvalue" });

      await apiClient("/api/talent/v1/members", { method });

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("token/value");
    }
  );

  it("GETではCSRFトークンを付けない", async () => {
    vi.stubGlobal("document", { cookie: "csrf_token=token" });

    await apiClient("/api/talent/v1/members");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("X-CSRF-Token")).toBe(false);
  });

  it("Cookieが無ければ書き込みでもCSRFトークンを付けない", async () => {
    await apiClient("/api/talent/v1/members", { method: "POST" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).has("X-CSRF-Token")).toBe(false);
  });

  it("401では現在のパスとクエリをcallbackUrlにしてログインへ移す", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await apiClient("/api/talent/v1/members");

    expect(assignMock).toHaveBeenCalledWith(
      new URL("https://example.test/login?callbackUrl=%2Ftalent%2Fmembers%3Fpage%3D2")
    );
  });
});
