import { describe, expect, it } from "vitest";

import {
  buildDepartmentTree,
  collectDescendantIds,
  collectManagerVisibleDepartmentIds
} from "@/modules/members/domain/department-hierarchy";

const departments = [
  { id: "hq", name: "開発本部", parentDepartmentId: null },
  { id: "dev", name: "開発部", parentDepartmentId: "hq" },
  { id: "infra", name: "インフラ部", parentDepartmentId: "hq" },
  { id: "team", name: "第1課", parentDepartmentId: "dev" },
  { id: "infra-team", name: "基盤課", parentDepartmentId: "infra" },
  { id: "sales", name: "営業部", parentDepartmentId: null }
];

describe("department hierarchy", () => {
  it("親の直後に名前順で並べ、深さとパスを付ける", () => {
    expect(buildDepartmentTree(departments).map(({ id, depth, pathLabel }) => ({ id, depth, pathLabel })))
      .toEqual([
        { id: "sales", depth: 0, pathLabel: "営業部" },
        { id: "hq", depth: 0, pathLabel: "開発本部" },
        { id: "infra", depth: 1, pathLabel: "開発本部 › インフラ部" },
        { id: "infra-team", depth: 2, pathLabel: "開発本部 › インフラ部 › 基盤課" },
        { id: "dev", depth: 1, pathLabel: "開発本部 › 開発部" },
        { id: "team", depth: 2, pathLabel: "開発本部 › 開発部 › 第1課" }
      ]);
  });

  it("自分を含む配下を集める", () => {
    expect(collectDescendantIds(departments, "dev")).toEqual(["dev", "team"]);
  });

  it("管理者向け範囲は並列部署そのものを含み、その配下は含めない", () => {
    expect(collectManagerVisibleDepartmentIds(departments, "dev")).toEqual([
      "dev", "team", "infra"
    ]);
  });

  it("循環している部署をルートとして扱う", () => {
    const tree = buildDepartmentTree([
      { id: "a", name: "A", parentDepartmentId: "b" },
      { id: "b", name: "B", parentDepartmentId: "a" }
    ]);
    expect(tree.map(({ id, depth, pathLabel }) => ({ id, depth, pathLabel }))).toEqual([
      { id: "a", depth: 0, pathLabel: "A" },
      { id: "b", depth: 0, pathLabel: "B" }
    ]);
    expect(collectDescendantIds([
      { id: "a", name: "A", parentDepartmentId: "b" },
      { id: "b", name: "B", parentDepartmentId: "a" }
    ], "a")).toEqual(["a", "b"]);
  });

  it("親が見つからない部署をルートとして扱う", () => {
    expect(buildDepartmentTree([
      { id: "orphan", name: "孤立部署", parentDepartmentId: "missing" }
    ])).toMatchObject([{ id: "orphan", depth: 0, pathLabel: "孤立部署" }]);
  });
});
