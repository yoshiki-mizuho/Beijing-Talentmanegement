import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeApi: vi.fn(),
  listSkillHolders: vi.fn()
}));

vi.mock("@/server/auth/authorization", () => ({
  authorizeApi: mocks.authorizeApi,
  managerOrAdmin: ["ADMIN", "MANAGER"]
}));
vi.mock("@/modules/skill-map/application/skill-map-service", () => ({
  listSkillHolders: mocks.listSkillHolders
}));

import { GET } from "@/app/api/talent/v1/skill-map/skills/[skillId]/holders/route";

describe("GET /api/talent/v1/skill-map/skills/[skillId]/holders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authorization response for a role without permission", async () => {
    mocks.authorizeApi.mockResolvedValue({
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    });

    const response = await GET(
      new NextRequest("http://localhost/api/talent/v1/skill-map/skills/skill-1/holders"),
      { params: Promise.resolve({ skillId: "skill-1" }) }
    );

    expect(response?.status).toBe(403);
    expect(mocks.listSkillHolders).not.toHaveBeenCalled();
  });

  it("uses an ADMIN-selected organization node when loading holders", async () => {
    mocks.authorizeApi.mockResolvedValue({
      session: { user: { role: "ADMIN", memberId: "admin-1" } }
    });
    mocks.listSkillHolders.mockResolvedValue([]);

    await GET(
      new NextRequest(
        "http://localhost/api/talent/v1/skill-map/skills/skill-1/holders?node=node-1"
      ),
      { params: Promise.resolve({ skillId: "skill-1" }) }
    );

    expect(mocks.listSkillHolders).toHaveBeenCalledWith(
      "ADMIN",
      "admin-1",
      "skill-1",
      "node-1"
    );
  });
});
