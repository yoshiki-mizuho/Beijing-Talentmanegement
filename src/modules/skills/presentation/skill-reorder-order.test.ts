import { describe, expect, it } from "vitest";

import {
  buildSkillOrder,
  categoryKey,
  containerKey,
  moveCategoryOrder,
  moveSkillOrder,
  skillKey,
} from "./skill-reorder-order";

const order = buildSkillOrder(
  [{ id: "a" }, { id: "b" }, { id: "c" }],
  [
    { id: "shown-1", categoryId: "a" },
    { id: "hidden", categoryId: "a" },
    { id: "shown-2", categoryId: "a" },
    { id: "target", categoryId: "b" },
  ],
);

describe("skill reorder order", () => {
  it("表示中のスキルを動かしても非表示スキルの相対位置を保つ", () => {
    const moved = moveSkillOrder(
      order,
      skillKey("shown-2"),
      skillKey("shown-1"),
    );
    expect(moved[0].skillIds).toEqual(["shown-2", "shown-1", "hidden"]);

    const movedDown = moveSkillOrder(
      order,
      skillKey("shown-1"),
      skillKey("shown-2"),
    );
    expect(movedDown[0].skillIds).toEqual(["hidden", "shown-2", "shown-1"]);
  });

  it("スキルを別カテゴリの対象位置と空カテゴリの末尾へ移動する", () => {
    const moved = moveSkillOrder(
      order,
      skillKey("shown-1"),
      skillKey("target"),
    );
    expect(moved[0].skillIds).toEqual(["hidden", "shown-2"]);
    expect(moved[1].skillIds).toEqual(["shown-1", "target"]);

    const movedToEmpty = moveSkillOrder(
      moved,
      skillKey("shown-1"),
      containerKey("c"),
    );
    expect(movedToEmpty[1].skillIds).toEqual(["target"]);
    expect(movedToEmpty[2].skillIds).toEqual(["shown-1"]);
  });

  it("カテゴリをスキルを含むまとまりごと移動する", () => {
    const moved = moveCategoryOrder(order, categoryKey("a"), categoryKey("c"));
    expect(moved.map((category) => category.id)).toEqual(["b", "c", "a"]);
    expect(moved[2].skillIds).toEqual(["shown-1", "hidden", "shown-2"]);
  });
});
