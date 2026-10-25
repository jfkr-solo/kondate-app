// 食材リスト（家にある食材）
import { INGREDIENTS } from "./ingredients";
import type { Dish, IngredientInfo, IngredientKind } from "./types";

/** 買う必要がある食材（調味料・水を除く） */
function foodsOf(dish: Dish): string[] {
  return dish.ingredients
    .map((l) => l.name)
    .filter((n) => n !== "水" && INGREDIENTS[n] && INGREDIENTS[n].kind !== "調味料");
}

export interface PantryCoverage {
  have: string[];
  missing: string[];
  ratio: number; // 0〜1
}

/** 料理の食材のうち、食材リストにあるものの割合 */
export function pantryCoverage(dish: Dish, pantry: Set<string>): PantryCoverage {
  const foods = foodsOf(dish);
  const have = foods.filter((f) => pantry.has(f));
  const missing = foods.filter((f) => !pantry.has(f));
  return { have, missing, ratio: foods.length ? have.length / foods.length : 0 };
}

/** 主菜のメインの食材（タンパク源）が食材リストにあるか */
export function mainInPantry(dish: Dish, pantry: Set<string>): boolean {
  return pantry.has(dish.mainIngredient);
}

/** 食材リスト画面で表示する順番 */
export const PANTRY_KINDS: IngredientKind[] = [
  "肉", "魚介", "卵", "大豆製品", "乳製品", "野菜", "きのこ", "海藻", "主食", "その他", "調味料",
];

export function ingredientsByKind(): Map<IngredientKind, IngredientInfo[]> {
  const map = new Map<IngredientKind, IngredientInfo[]>();
  for (const kind of PANTRY_KINDS) map.set(kind, []);
  for (const info of Object.values(INGREDIENTS)) {
    if (info.name === "水") continue;
    map.get(info.kind)?.push(info);
  }
  return map;
}

/** まとめて追加できるセット */
export const PANTRY_PRESETS: { label: string; items: string[] }[] = [
  {
    label: "基本の調味料",
    items: [
      "醤油", "みりん", "酒", "砂糖", "塩", "こしょう", "塩こしょう", "酢", "味噌", "だし汁",
      "サラダ油", "ごま油", "オリーブオイル", "片栗粉", "小麦粉", "鶏ガラスープの素", "コンソメ",
      "ケチャップ", "マヨネーズ", "ポン酢",
    ],
  },
  { label: "いつもある食材", items: ["卵", "玉ねぎ", "にんじん", "じゃがいも", "ご飯", "しょうが", "にんにく"] },
];
