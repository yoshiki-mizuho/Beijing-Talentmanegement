import { describe, expect, it } from "vitest";

import { generateNextRoleCodeFromExistingCodes } from "@/modules/roles/domain/role-code";

describe("generateNextRoleCodeFromExistingCodes", () => {
  it("最初のコードを返す", () => {
    expect(generateNextRoleCodeFromExistingCodes([])).toBe("ROLE-0001");
  });

  it("採番形式の最大値に1を足す", () => {
    expect(
      generateNextRoleCodeFromExistingCodes([
        "ROLE-0009",
        "ROLE-0012",
        "ROLE-E2E-1234",
        "ROLE-999",
      ]),
    ).toBe("ROLE-0013");
  });

  it("9999を超えたら桁を増やす", () => {
    expect(generateNextRoleCodeFromExistingCodes(["ROLE-9999"])).toBe(
      "ROLE-10000",
    );
  });
});
