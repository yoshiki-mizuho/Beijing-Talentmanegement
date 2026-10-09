import { AuthRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
}));

vi.mock("@/server/auth/session", () => ({
  getCurrentSession: mocks.getCurrentSession
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

import { managerOrAdmin, requirePageRoles } from "@/server/auth/authorization";

function createSession(
  role: AuthRole,
  options: { memberId?: string | null; passwordChangeRequired?: boolean } = {}
) {
  return {
    user: {
      id: "user-1",
      name: "テストユーザー",
      email: "user@example.com",
      role,
      memberId: options.memberId === undefined ? "member-1" : options.memberId,
      isActive: true,
      passwordChangeRequired: options.passwordChangeRequired ?? false
    },
    expires: "2099-01-01T00:00:00.000Z"
  };
}

describe("requirePageRoles", () => {
  beforeEach(() => {
    mocks.getCurrentSession.mockReset();
    mocks.redirect.mockClear();
  });

  it("未認証またはメンバー未紐付けならログインへリダイレクトする", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);

    await expect(requirePageRoles(managerOrAdmin)).rejects.toThrow("REDIRECT:/login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("初回パスワード変更が必要なら変更画面へリダイレクトする", async () => {
    mocks.getCurrentSession.mockResolvedValue(
      createSession(AuthRole.ADMIN, { passwordChangeRequired: true })
    );

    await expect(requirePageRoles(managerOrAdmin)).rejects.toThrow(
      "REDIRECT:/account/password"
    );
  });

  it("権限外なら例外を生成せずダッシュボードへリダイレクトする", async () => {
    mocks.getCurrentSession.mockResolvedValue(createSession(AuthRole.MEMBER));

    await expect(requirePageRoles(managerOrAdmin)).rejects.toThrow(
      "REDIRECT:/dashboard"
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("許可ロールならメンバー紐付きセッションを返す", async () => {
    const session = createSession(AuthRole.MANAGER);
    mocks.getCurrentSession.mockResolvedValue(session);

    await expect(requirePageRoles(managerOrAdmin)).resolves.toBe(session);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
