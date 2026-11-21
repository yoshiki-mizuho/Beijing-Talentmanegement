import { AuthRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  getTenantId: vi.fn(),
  getUser: vi.fn(),
  getLeaderScope: vi.fn()
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { member: { findUnique: mocks.findUnique, create: mocks.create } },
  getTenantId: mocks.getTenantId
}));
vi.mock("@/server/platform/directory", () => ({
  getUser: mocks.getUser,
  getLeaderScope: mocks.getLeaderScope
}));

import { resolveCurrentSession } from "@/server/auth/session";

const platformUserId = "22222222-2222-4222-8222-222222222222";

function requestHeaders(values: Record<string, string> = {}) {
  return new Headers({
    "X-Auth-Tenant-Id": "11111111-1111-4111-8111-111111111111",
    "X-Auth-User-Id": platformUserId,
    "X-Auth-User-Role": "MEMBER",
    ...values
  });
}

function platformUser(status: "ACTIVE" | "INACTIVE" = "ACTIVE") {
  return {
    id: platformUserId,
    name: "利用者",
    email: "user@example.com",
    status,
    organizationNodeId: null,
    nodeName: null,
    avatarUrl: null,
    avatarColor: null,
    isNodeLeader: false,
    role: "MEMBER"
  };
}

describe("resolveCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
    mocks.getUser.mockResolvedValue(platformUser());
    mocks.getLeaderScope.mockResolvedValue({ nodeIds: [], members: new Map() });
    mocks.findUnique.mockResolvedValue({ id: "member-1", name: "利用者" });
  });

  it("必須ヘッダが無いリクエストを未認証にする", async () => {
    const headers = requestHeaders();
    headers.delete("X-Auth-Tenant-Id");
    expect(await resolveCurrentSession(headers)).toEqual({
      status: "unauthenticated",
      session: null
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("初回アクセス時に Hub 固有の行を自動作成する", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "member-1", name: "利用者" });
    expect((await resolveCurrentSession(requestHeaders())).status).toBe(
      "authenticated"
    );
    expect(mocks.create).toHaveBeenCalledWith({
      data: { platformUserId, name: "利用者", email: "user@example.com" }
    });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });

  it("基盤で INACTIVE の利用者を未登録として扱う", async () => {
    mocks.getUser.mockResolvedValue(platformUser("INACTIVE"));
    expect((await resolveCurrentSession(requestHeaders())).status).toBe("unregistered");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("基盤の ADMIN を管理者として扱う", async () => {
    const result = await resolveCurrentSession(requestHeaders({ "X-Auth-User-Role": "ADMIN" }));
    expect(result.session?.user.role).toBe(AuthRole.ADMIN);
    expect(mocks.getLeaderScope).not.toHaveBeenCalled();
  });

  it("基盤でリーダー範囲を持つ利用者をマネージャーとして扱う", async () => {
    mocks.getLeaderScope.mockResolvedValue({ nodeIds: ["node-1"], members: new Map() });
    const result = await resolveCurrentSession(requestHeaders());
    expect(result.session?.user.role).toBe(AuthRole.MANAGER);
  });

  it("基盤でリーダー範囲を持たない利用者をメンバーとして扱う", async () => {
    const result = await resolveCurrentSession(requestHeaders());
    expect(result.session?.user.role).toBe(AuthRole.MEMBER);
  });
});
