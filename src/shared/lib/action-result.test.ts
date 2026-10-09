import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/server/auth/authorization";
import { runAction } from "@/shared/lib/action-result";
import { UserFacingError } from "@/shared/lib/user-facing-error";

describe("runAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a success result", async () => {
    await expect(
      runAction(async () => 2, (count) => `${count}件を更新しました。`)
    ).resolves.toEqual({
      status: "success",
      message: "2件を更新しました。"
    });
  });

  it("returns the message from UserFacingError", async () => {
    await expect(
      runAction(async () => {
        throw new UserFacingError("利用者向けのエラーです。");
      }, "完了しました。")
    ).resolves.toEqual({
      status: "error",
      message: "利用者向けのエラーです。"
    });
  });

  it("returns the first Zod issue in Japanese", async () => {
    await expect(
      runAction(async () => {
        z.object({ name: z.string().min(2, "名前は2文字以上で入力してください。") })
          .parse({ name: "a" });
      }, "完了しました。")
    ).resolves.toEqual({
      status: "error",
      message: "名前は2文字以上で入力してください。"
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      runAction(async () => {
        throw new Error("database details");
      }, "完了しました。")
    ).resolves.toEqual({
      status: "error",
      message: "処理に失敗しました。時間をおいて再度お試しください。"
    });
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("rethrows authorization errors", async () => {
    const error = new AuthorizationError("Forbidden.", 403);

    await expect(
      runAction(async () => {
        throw error;
      }, "完了しました。")
    ).rejects.toBe(error);
  });
});
