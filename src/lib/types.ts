// 献立アプリで使う型定義

export type Genre = "和食" | "中華" | "洋食";
export type Category = "主菜" | "副菜" | "汁物";
export type Method = "焼く" | "煮る" | "炒める" | "蒸す" | "揚げる" | "生食・和える";
export type Flavor =
  | "しょうゆ"
  | "甘辛"
  | "みそ"
  | "塩"
  | "甘酢"
  | "ピリ辛"
  | "ごま"
  | "さっぱり"
  | "トマト"
  | "クリーム"
  | "中華"
  | "カレー"
  | "洋風";

export type Equipment = "電子レンジ" | "魚焼きグリル" | "オーブン" | "揚げ鍋";
export const SERVING_OPTIONS = [1, 2, 3, 4];

export const ALL_EQUIPMENT: Equipment[] = ["電子レンジ", "魚焼きグリル", "オーブン", "揚げ鍋"];

export type Unit =
  | "g"
  | "ml"
  | "個"
  | "本"
  | "丁"
  | "枚"
  | "パック"
  | "片"
  | "袋"
  | "切れ"
  | "尾"
  | "株"
  | "缶"
  | "大さじ"
  | "小さじ"
  | "少々"
  | "適量";

export type IngredientKind =
  | "肉"
  | "魚介"
  | "卵"
  | "大豆製品"
  | "乳製品"
  | "野菜"
  | "きのこ"
  | "海藻"
  | "主食"
  | "その他"
  | "調味料";

/** 食材マスタ（タンパク質・価格・旬の計算に使う） */
export interface IngredientInfo {
  name: string;
  kind: IngredientKind;
  unit: Unit; // 料理マスタで使う基本単位
  gPerUnit?: number; // 基本単位1つあたりの可食部重量(g)。unit が g/ml の場合は不要
  proteinPer100g: number; // 日本食品標準成分表を参考にした概算値
  pricePerUnit?: number; // 基本単位あたりの概算価格(円)
  season?: number[]; // 旬の月
  strict?: boolean; // true の場合、旬の前後1か月以外は入手しにくいので提案しない
  allergens?: string[];
  substitutes?: string[]; // 代替できる食材
  tip?: string; // 旬の理由・栄養メモ
  fish?: boolean; // 魚料理判定用（エビ・イカは含めない）
}

export interface IngredientLine {
  name: string;
  amount: number | null; // 少々・適量は null
  unit: Unit;
}

/** 料理マスタ */
export interface Dish {
  id: string;
  name: string;
  normalizedName: string;
  group?: string; // 類似料理グループ（同グループは同一料理扱い）
  genre: Genre;
  category: Category;
  method: Method;
  flavor: Flavor;
  time: number; // 調理時間(分)
  servings: number; // 材料の基準人数
  ingredients: IngredientLine[];
  steps: string[];
  equipment: Equipment[];
  isPasta: boolean;
  isFried: boolean;
  isFish: boolean;
  mainIngredient: string; // 主な食材（主菜はタンパク源）
}

/** 献立履歴（料理マスタとは分離） */
export interface HistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dishId: string | null; // マスタにない料理は null
  dishName: string;
  category: Category;
  servings: number;
  made: boolean;
  auto?: boolean; // 献立から自動記録したもの
}

export interface DayPlan {
  date: string;
  mainId: string;
  sideId: string;
  soupId: string;
  notes: string[]; // 条件を満たせなかった理由など
}

export interface WeekPlan {
  weekStart: string; // 月曜日
  days: DayPlan[];
  generatedAt: string;
  seed: number;
}

export interface Settings {
  servings: number;
  budgetPerMeal: number; // 1食あたり（世帯合計）の予算(円)
  targetProtein: number; // 夕食1人あたりの目標タンパク質(g)
  maxCookTime: number; // 1品あたりの調理時間の上限(分)
  dislikes: string[];
  allergies: string[];
  equipment: Equipment[];
}

export const DEFAULT_SETTINGS: Settings = {
  servings: 3,
  budgetPerMeal: 2000,
  targetProtein: 30,
  maxCookTime: 45,
  dislikes: [],
  allergies: [],
  equipment: [...ALL_EQUIPMENT],
};

export const ALLERGENS = [
  "卵",
  "乳",
  "小麦",
  "えび",
  "そば",
  "落花生",
  "大豆",
  "ごま",
  "さけ",
  "さば",
  "いか",
  "魚類",
  "牛肉",
  "豚肉",
  "鶏肉",
];
