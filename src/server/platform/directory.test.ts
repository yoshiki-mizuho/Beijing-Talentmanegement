import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startFakePlatform } from "../../../e2e/platform-fake/server";
import { runWithTenant } from "@/server/db/prisma";

import {
  clearPlatformDirectoryCache,
  getLeaderScope,
  getOrganization,
  getSuperiorIds,
  getUser,
  getUsers,
  PlatformUnavailableError
} from "./directory";
import { resetPlatformGrpcClientForTests } from "./grpc";

const LOCAL_TENANT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TENANT_ID = "11111111-1111-4111-8111-222222222222";
const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const SCREEN_LEADER_ID = "22222222-2222-4222-8222-000000000004";

let fake: Awaited<ReturnType<typeof startFakePlatform>>;

beforeAll(async () => {
  fake = await startFakePlatform();
  process.env.PLATFORM_USER_ORG_GRPC_ADDR = `127.0.0.1:${fake.grpcPort}`;
});

beforeEach(async () => {
  clearPlatformDirectoryCache();
  process.env.PLATFORM_GRPC_TIMEOUT_MS = "3000";
  await fetch(`http://127.0.0.1:${fake.httpPort}/__fake/reset`, { method: "POST" });
});

afterAll(async () => {
  resetPlatformGrpcClientForTests();
  await fake.stop();
});

describe("platform directory", () => {
  it("splits GetUsers requests and returns an ID keyed map", async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `missing-${index}`);
    ids[0] = ADMIN_ID;
    const users = await runWithTenant(LOCAL_TENANT_ID, () => getUsers(ids));
    expect(users.get(ADMIN_ID)?.name).toBe("佐藤 花子");
    expect(users.size).toBe(1);
  });

  it("returns null for a missing user and keeps tenants separate", async () => {
    const local = await runWithTenant(LOCAL_TENANT_ID, () => getUser(ADMIN_ID));
    const other = await runWithTenant(OTHER_TENANT_ID, () => getUser(ADMIN_ID));
    expect(local?.id).toBe(ADMIN_ID);
    expect(other).toBeNull();
  });

  it("walks to the root and resolves leader scope and superiors", async () => {
    const organization = await runWithTenant(LOCAL_TENANT_ID, () =>
      getOrganization(SCREEN_LEADER_ID)
    );
    const scope = await runWithTenant(LOCAL_TENANT_ID, () =>
      getLeaderScope(SCREEN_LEADER_ID)
    );
    const superiors = await runWithTenant(LOCAL_TENANT_ID, () =>
      getSuperiorIds(SCREEN_LEADER_ID)
    );
    expect(organization.nodes).toHaveLength(5);
    expect(scope.members.size).toBe(2);
    expect(superiors).toContain("22222222-2222-4222-8222-000000000003");
  });

  it("retries deadlines and exposes a platform unavailable error", async () => {
    process.env.PLATFORM_GRPC_TIMEOUT_MS = "10";
    await fetch(`http://127.0.0.1:${fake.httpPort}/__fake/delay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delayMs: 50 })
    });
    await expect(runWithTenant(LOCAL_TENANT_ID, () => getUser(ADMIN_ID)))
      .rejects.toBeInstanceOf(PlatformUnavailableError);
  });
});
