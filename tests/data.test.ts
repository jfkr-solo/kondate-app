import { describe, expect, it } from "vitest";
import { DISHES } from "@/lib/dishes";
import { INGREDIENTS, seasonalVegetables } from "@/lib/ingredients";
import { proteinPerServing, seasonalIngredientsOf } from "@/lib/nutrition";
import { isSameDish } from "@/lib/rules";

describe("料理マスタ", () => {
  it("IDと正規化した料理名が重複していない", () => {
    const ids = new Set(DISHES.map((d) => d.id));
    expect(ids.size).toBe(DISHES.length);
    const names = DISHES.map((d) => d.normalizedName);
    expect(new Set(names).size).toBe(names.length);
  });

  it("異なる料理が表記揺れ判定で同一扱いされない（類似グループを除く）", () => {
    const clashes: string[] = [];
    for (const a of DISHES) {
      for (const b of DISHES) {
        if (a.id >= b.id) continue;
        if (a.group && a.group === b.group) continue;
        if (isSameDish({ dishId: a.id, name: a.name }, b)) clashes.push(`${a.name} / ${b.name}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("すべての材料が食材マスタにあり、単位が正しい", () => {
    const errors: string[] = [];
    for (const d of DISHES) {
      for (const l of d.ingredients) {
        const info = INGREDIENTS[l.name];
        if (!info) errors.push(`${d.name}: ${l.name} がない`);
        else if (info.kind !== "調味料" && l.unit !== info.unit) errors.push(`${d.name}: ${l.name} の単位 ${l.unit} ≠ ${info.unit}`);
      }
    }
    expect(errors).toEqual([]);
  });

  it("作り方が2手順以上あり、分量のある材料がある", () => {
    for (const d of DISHES) {
      expect(d.steps.length, d.name).toBeGreaterThanOrEqual(2);
      expect(d.ingredients.some((l) => l.amount != null), d.name).toBe(true);
    }
  });

  it("主菜はタンパク質を十分に含む（1人15g以上）", () => {
    for (const d of DISHES.filter((d) => d.category === "主菜")) {
      expect(proteinPerServing(d), d.name).toBeGreaterThanOrEqual(15);
    }
  });

  it("各区分に十分な料理数がある", () => {
    const count = (c: string) => DISHES.filter((d) => d.category === c).length;
    expect(count("主菜")).toBeGreaterThanOrEqual(40);
    expect(count("副菜")).toBeGreaterThanOrEqual(30);
    expect(count("汁物")).toBeGreaterThanOrEqual(25);
    expect(DISHES.filter((d) => d.isFish).length).toBeGreaterThanOrEqual(10);
    expect(DISHES.filter((d) => d.isPasta).length).toBeGreaterThanOrEqual(4);
    expect(DISHES.filter((d) => d.isFried).length).toBeGreaterThanOrEqual(4);
  });

  it("どの月にも旬の野菜を使う料理が10品以上ある", () => {
    for (let m = 1; m <= 12; m++) {
      expect(seasonalVegetables(m).length, `${m}月`).toBeGreaterThan(3);
      const n = DISHES.filter((d) => seasonalIngredientsOf(d, m).length > 0).length;
      expect(n, `${m}月`).toBeGreaterThanOrEqual(10);
    }
  });
});
