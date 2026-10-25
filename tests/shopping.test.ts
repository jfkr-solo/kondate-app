import { describe, expect, it } from "vitest";
import { buildShoppingList, formatAmount } from "@/lib/shopping";

describe("買い物リスト", () => {
  const days = [
    { date: "2026-10-26", mainId: "m001", sideId: "s203", soupId: "u202", notes: [] }, // 照り焼き(キャベツ100g) コールスロー(キャベツ200g) スープ(キャベツ120g)
    { date: "2026-10-27", mainId: "p001", sideId: "s201", soupId: "u001", notes: [] },
  ];

  it("同じ食材の分量を合算し、使う料理をまとめる", () => {
    const list = buildShoppingList(days, 2);
    const cabbage = list.find((i) => i.name === "キャベツ")!;
    expect(cabbage.amounts).toEqual([{ unit: "g", amount: 420 }]);
    expect(cabbage.uses.map((u) => u.dish)).toEqual(["鶏の照り焼き", "コールスロー", "キャベツとベーコンのコンソメスープ"]);
  });

  it("人数に合わせて換算する", () => {
    const list = buildShoppingList(days, 4);
    expect(list.find((i) => i.name === "鶏もも肉")!.amounts[0].amount).toBe(600);
  });

  it("パスタの日はご飯を数えない", () => {
    const rice = buildShoppingList(days, 2).find((i) => i.name === "ご飯")!;
    expect(rice.amounts[0].amount).toBe(300);
  });

  it("水は買い物リストに含めない", () => {
    expect(buildShoppingList(days, 2).some((i) => i.name === "水")).toBe(false);
  });

  it("分量を読みやすく表示する", () => {
    expect(formatAmount(423, "g")).toBe("420g");
    expect(formatAmount(1.5, "個")).toBe("1.5個");
    expect(formatAmount(2, "大さじ")).toBe("大さじ2");
    expect(formatAmount(null, "少々")).toBe("少々");
  });
});
