import { getDish } from "./dishes";
import { INGREDIENTS } from "./ingredients";
import { RICE_GRAMS_PER_PERSON } from "./nutrition";
import type { DayPlan, IngredientKind, Unit } from "./types";

export interface ShoppingItem {
  name: string;
  kind: IngredientKind;
  amounts: { unit: Unit; amount: number | null }[]; // 単位ごとに合算
  uses: { date: string; dish: string }[];
}

const KIND_ORDER: IngredientKind[] = ["肉", "魚介", "卵", "大豆製品", "乳製品", "野菜", "きのこ", "海藻", "主食", "その他", "調味料"];

/** 1週間分の材料を食材ごとに合算する（人数に合わせて換算） */
export function buildShoppingList(days: DayPlan[], servings: number): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const day of days) {
    for (const id of [day.mainId, day.sideId, day.soupId]) {
      const dish = getDish(id);
      if (!dish) continue;
      const scale = servings / dish.servings;
      for (const line of dish.ingredients) {
        if (line.name === "水") continue;
        const info = INGREDIENTS[line.name];
        const item =
          map.get(line.name) ??
          { name: line.name, kind: info?.kind ?? "その他", amounts: [], uses: [] };
        const slot = item.amounts.find((a) => a.unit === line.unit);
        const add = line.amount == null ? null : line.amount * scale;
        if (slot) slot.amount = slot.amount == null || add == null ? slot.amount ?? add : slot.amount + add;
        else item.amounts.push({ unit: line.unit, amount: add });
        if (!item.uses.some((u) => u.date === day.date && u.dish === dish.name)) {
          item.uses.push({ date: day.date, dish: dish.name });
        }
        map.set(line.name, item);
      }
    }
    // 主食のご飯（パスタの日以外）
    if (!getDish(day.mainId)?.isPasta) {
      const rice = map.get("ご飯") ?? { name: "ご飯", kind: "主食" as IngredientKind, amounts: [{ unit: "g" as Unit, amount: 0 }], uses: [] };
      rice.amounts[0].amount = (rice.amounts[0].amount ?? 0) + RICE_GRAMS_PER_PERSON * servings;
      rice.uses.push({ date: day.date, dish: "ご飯" });
      map.set("ご飯", rice);
    }
  }
  return [...map.values()].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name, "ja"),
  );
}

export function formatAmount(amount: number | null, unit: Unit): string {
  if (amount == null) return unit;
  if (unit === "大さじ" || unit === "小さじ") return `${unit}${round(amount, 1)}`;
  if (unit === "g" || unit === "ml") {
    const v = amount >= 100 ? Math.round(amount / 10) * 10 : Math.round(amount);
    return `${v}${unit}`;
  }
  return `${round(amount, 1)}${unit}`;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** ご飯の量(g)を炊く前の米の合数に換算（1合 ≒ 炊き上がり330g） */
export function riceToGo(grams: number): number {
  return Math.ceil((grams / 330) * 2) / 2;
}
