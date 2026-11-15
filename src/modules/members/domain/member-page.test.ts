import { describe, expect, it } from "vitest";

import { paginateItems } from "@/modules/members/domain/member-page";

describe("paginateItems", () => {
  it("returns only the requested page with the total count", () => {
    expect(paginateItems(Array.from({ length: 25 }, (_, index) => index + 1), 2, 20)).toEqual({
      items: [21, 22, 23, 24, 25],
      total: 25,
      page: 2,
      pageSize: 20
    });
  });

  it("returns the last page when the requested page is out of range", () => {
    expect(paginateItems(Array.from({ length: 21 }, (_, index) => index + 1), 99, 20)).toEqual({
      items: [21],
      total: 21,
      page: 2,
      pageSize: 20
    });
  });
});
