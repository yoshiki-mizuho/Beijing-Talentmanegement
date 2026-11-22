import { describe, expect, it } from "vitest";

import {
  collectDescendantNodeIds,
  collectManagerVisibleNodeIds,
} from "@/modules/members/domain/node-hierarchy";

const nodes = [
  { id: "root", name: "本部", parentId: null },
  { id: "product", name: "プロダクト", parentId: "root" },
  { id: "sales", name: "営業", parentId: "root" },
  { id: "ui", name: "画面", parentId: "product" },
  { id: "platform", name: "基盤", parentId: "product" },
];

describe("node hierarchy", () => {
  it("collects the selected node and all descendants", () => {
    expect(collectDescendantNodeIds(nodes, "product")).toEqual(["product", "ui", "platform"]);
  });

  it("adds sibling nodes to a manager's visible nodes", () => {
    expect(collectManagerVisibleNodeIds(nodes, "product")).toEqual(["product", "ui", "platform", "sales"]);
  });

  it("does not loop forever when malformed nodes contain a cycle", () => {
    const cyclic = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    expect(collectDescendantNodeIds(cyclic, "a")).toEqual(["a", "b"]);
  });
});
