import { describe, expect, it } from "vitest";

import { changePasswordInputSchema } from "@/modules/auth/domain/password-schema";

describe("changePasswordInputSchema", () => {
  const validInput = {
    userId: "user-1",
    currentPassword: "password",
    newPassword: "new-password",
    confirmPassword: "new-password"
  };

  it("accepts a valid password change", () => {
    expect(changePasswordInputSchema.parse(validInput)).toEqual(validInput);
  });

  it("rejects a short new password", () => {
    expect(() =>
      changePasswordInputSchema.parse({
        ...validInput,
        newPassword: "short",
        confirmPassword: "short"
      })
    ).toThrow();
  });

  it("rejects mismatched confirmation", () => {
    expect(() =>
      changePasswordInputSchema.parse({
        ...validInput,
        confirmPassword: "different-password"
      })
    ).toThrow();
  });

  it("rejects a new password that matches the current password", () => {
    expect(() =>
      changePasswordInputSchema.parse({
        ...validInput,
        newPassword: "password",
        confirmPassword: "password"
      })
    ).toThrow();
  });
});
