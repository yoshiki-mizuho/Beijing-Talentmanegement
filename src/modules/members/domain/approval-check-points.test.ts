import { describe, expect, it } from "vitest";

import { getApprovalCheckPoints } from "./approval-check-points";

const baseInput = {
  requestedLevel: 3,
  currentLevel: 2,
  prerequisites: [],
  previousAssessment: null,
  submittedAt: "2026-11-05T00:00:00.000Z"
};

describe("getApprovalCheckPoints", () => {
  it("前提スキルとの差がちょうど2のときに確認ポイントを出す", () => {
    const result = getApprovalCheckPoints({
      ...baseInput,
      requestedLevel: 3,
      prerequisites: [{ name: "JavaScript", currentLevel: 1 }]
    });

    expect(result).toContainEqual({
      type: "prerequisite",
      label: "前提スキルとの差",
      detail: "前提のJavaScriptがLv1です。申請のLv3と2段の差があります。"
    });
  });

  it("未登録の前提スキルをレベル0として判定する", () => {
    const result = getApprovalCheckPoints({
      ...baseInput,
      requestedLevel: 2,
      prerequisites: [{ name: "JavaScript", currentLevel: null }]
    });

    expect(result[0]?.detail).toBe("前提のJavaScriptが未登録です。");
  });

  it("現在レベルからちょうど2段上がるときだけ上昇を出す", () => {
    expect(getApprovalCheckPoints({
      ...baseInput,
      requestedLevel: 4,
      currentLevel: 2
    })).toContainEqual({
      type: "jump",
      label: "2段以上の上昇",
      detail: "Lv2からLv4へ、2段の上昇です。"
    });
    expect(getApprovalCheckPoints({
      ...baseInput,
      requestedLevel: 2,
      currentLevel: null
    })).toEqual([]);
  });

  it("差し戻しからちょうど30日後の再申請を判定する", () => {
    const result = getApprovalCheckPoints({
      ...baseInput,
      previousAssessment: {
        requestedLevel: 3,
        status: "REJECTED",
        managerComment: "利用例を確認したいです",
        reviewedAt: "2026-10-06T00:00:00.000Z"
      }
    });

    expect(result.map((item) => item.type)).toEqual(["resubmit", "rejected"]);
    expect(result[1]?.detail).toBe("前回のコメント：「利用例を確認したいです」");
  });
});
