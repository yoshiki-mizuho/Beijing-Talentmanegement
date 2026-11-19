import { AuthRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } }
}));

import { resolveCurrentSession } from "@/server/auth/session";

function requestHeaders(values: Record<string, string> = {}) {
  const headers = new Headers({
    "X-Auth-Tenant-Id": "11111111-1111-4111-8111-111111111111",
    "X-Auth-User-Id": "22222222-2222-4222-8222-222222222222",
    "X-Auth-User-Role": "MEMBER",
    ...values
  });
  return headers;
}

function user(role: AuthRole, status = "ACTIVE") {
  return {
    id: "user-1",
    role,
    member: { id: "member-1", name: "利用者", status }
  };
}

describe("resolveCurrentSession", () => {
  beforeEach(() => mocks.findUnique.mockReset());

  it("必須ヘッダが無いリクエストを未認証にする", async () => {
    const headers = requestHeaders();
    headers.delete("X-Auth-Tenant-Id");
    expect(await resolveCurrentSession(headers)).toEqual({
      status: "unauthenticated",
      session: null
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("登録されていない利用者を拒否する", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await resolveCurrentSession(requestHeaders())).status).toBe("unregistered");
  });

  it("在籍中でないメンバーを拒否する", async () => {
    mocks.findUnique.mockResolvedValue(user(AuthRole.MEMBER, "INACTIVE"));
    expect((await resolveCurrentSession(requestHeaders())).status).toBe("unregistered");
  });

  it("基盤の ADMIN を管理者として扱う", async () => {
    mocks.findUnique.mockResolvedValue(user(AuthRole.MEMBER));
    const result = await resolveCurrentSession(requestHeaders({ "X-Auth-User-Role": "ADMIN" }));
    expect(result.session?.user.role).toBe(AuthRole.ADMIN);
  });

  it("Hub の MANAGER をマネージャーとして扱う", async () => {
    mocks.findUnique.mockResolvedValue(user(AuthRole.MANAGER));
    const result = await resolveCurrentSession(requestHeaders());
    expect(result.session?.user.role).toBe(AuthRole.MANAGER);
  });

  it("DB の ADMIN を基盤が MEMBER ならメンバーとして扱う", async () => {
    mocks.findUnique.mockResolvedValue(user(AuthRole.ADMIN));
    const result = await resolveCurrentSession(requestHeaders());
    expect(result.session?.user.role).toBe(AuthRole.MEMBER);
  });
});
