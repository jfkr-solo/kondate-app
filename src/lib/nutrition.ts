import { INGREDIENTS, isAvailable, isInSeason } from "./ingredients";
import type { Dish, IngredientInfo, IngredientLine, Settings } from "./types";

/** 主食のご飯（1人分）。パスタの日は付けない */
export const RICE_GRAMS_PER_PERSON = 150;

function lineGrams(line: IngredientLine, info: IngredientInfo): number {
  if (line.amount == null) return 0;
  if (line.unit === "g" || line.unit === "ml") return line.amount;
  if (line.unit === "大さじ") return line.amount * (info.gPerUnit ?? 15);
  if (line.unit === "小さじ") return line.amount * ((info.gPerUnit ?? 15) / 3);
  return line.amount * (info.gPerUnit ?? 0);
}

/** 料理1人分のタンパク質(g)。食材の使用量から概算 */
export function proteinPerServing(dish: Dish): number {
  let total = 0;
  for (const line of dish.ingredients) {
    const info = INGREDIENTS[line.name];
    if (!info || info.proteinPer100g === 0) continue;
    total += (lineGrams(line, info) * info.proteinPer100g) / 100;
  }
  return Math.round((total / dish.servings) * 10) / 10;
}

export function riceProteinPerServing(): number {
  return Math.round(((RICE_GRAMS_PER_PERSON * INGREDIENTS["ご飯"].proteinPer100g) / 100) * 10) / 10;
}

/** 料理の材料費（指定人数分、調味料を除く概算） */
export function dishCost(dish: Dish, servings: number): number {
  let total = 0;
  for (const line of dish.ingredients) {
    const info = INGREDIENTS[line.name];
    if (!info || info.kind === "調味料" || line.amount == null || !info.pricePerUnit) continue;
    total += line.amount * info.pricePerUnit;
  }
  return Math.round((total * servings) / dish.servings);
}

export function riceCost(servings: number): number {
  return Math.round(RICE_GRAMS_PER_PERSON * (INGREDIENTS["ご飯"].pricePerUnit ?? 0) * servings);
}

/** その月に旬の野菜・きのこ */
export function seasonalIngredientsOf(dish: Dish, month: number): IngredientInfo[] {
  const out: IngredientInfo[] = [];
  for (const line of dish.ingredients) {
    const info = INGREDIENTS[line.name];
    if (!info) continue;
    if ((info.kind === "野菜" || info.kind === "きのこ") && isInSeason(info, month)) out.push(info);
  }
  return out;
}

/** 旬の魚を使っているか */
export function usesSeasonalFish(dish: Dish, month: number): boolean {
  return dish.ingredients.some((l) => {
    const info = INGREDIENTS[l.name];
    return !!info?.fish && isInSeason(info, month);
  });
}

/** 旬が限られる食材が手に入らない月か */
export function isOutOfSeason(dish: Dish, month: number): boolean {
  return dish.ingredients.some((l) => {
    const info = INGREDIENTS[l.name];
    return info ? !isAvailable(info, month) : false;
  });
}

export function allergensOf(dish: Dish): Set<string> {
  const s = new Set<string>();
  for (const line of dish.ingredients) {
    for (const a of INGREDIENTS[line.name]?.allergens ?? []) s.add(a);
  }
  return s;
}

/** 設定（アレルギー・苦手・調理器具・時間）で除外すべき理由。問題なければ null */
export function settingsConflict(dish: Dish, settings: Settings): string | null {
  const allergens = allergensOf(dish);
  for (const a of settings.allergies) {
    if (allergens.has(a)) return `アレルギー食材(${a})を含む`;
  }
  for (const word of settings.dislikes) {
    const w = word.trim();
    if (!w) continue;
    const hit = dish.ingredients.find((l) => l.name.includes(w)) ?? (dish.name.includes(w) ? { name: w } : null);
    if (hit) return `苦手な食材(${w})を含む`;
  }
  for (const e of dish.equipment) {
    if (!settings.equipment.includes(e)) return `調理器具(${e})が必要`;
  }
  if (dish.time > settings.maxCookTime) return `調理時間が上限(${settings.maxCookTime}分)を超える`;
  return null;
}

/** 調味料・水を除いた食材名 */
export function mainFoods(dish: Dish): string[] {
  return dish.ingredients
    .filter((l) => {
      const k = INGREDIENTS[l.name]?.kind;
      return k && k !== "調味料";
    })
    .map((l) => l.name);
}

/** 献立のタンパク源（魚・肉・卵・大豆製品）の食材 */
export function proteinFoods(dish: Dish): string[] {
  return dish.ingredients
    .filter((l) => ["肉", "魚介", "卵", "大豆製品"].includes(INGREDIENTS[l.name]?.kind ?? ""))
    .map((l) => l.name);
}
