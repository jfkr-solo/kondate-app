import { getDish } from "./dishes";
import { diffDays } from "./dates";
import { isSameDishName } from "./normalize";
import type { Category, Dish, HistoryEntry, WeekPlan } from "./types";

// ---- 献立ルールの定数 ----
export const NO_REPEAT_DAYS = 14; // 同じ料理は14日以内に再提案しない
export const FRIED_INTERVAL_DAYS = 14; // 揚げ物は14日間に1回まで
export const PASTA_INTERVAL_DAYS = 14; // パスタは14日間に1回
export const FISH_MIN_PER_WEEK = 1; // 魚料理は7日間に1回以上
export const FISH_TARGET_PER_WEEK = 2; // 生成時の目標（7日間の窓をまたいでも1回以上を保つため）
export const MAX_SAME_GENRE_PER_WEEK = 3;
export const MAX_SAME_METHOD_PER_WEEK = 3;

/**
 * 判定に使う「食事の記録」。
 * 実際に作った履歴(made=true)と、保存済みの献立計画の両方を含む。
 */
export interface MealEvent {
  date: string;
  dishId: string | null;
  name: string;
  category: Category;
  source: "history" | "plan";
}

export function eventsFromHistory(history: HistoryEntry[]): MealEvent[] {
  return history
    .filter((h) => h.made)
    .map((h) => ({ date: h.date, dishId: h.dishId, name: h.dishName, category: h.category, source: "history" }));
}

export function eventsFromPlans(plans: WeekPlan[]): MealEvent[] {
  const out: MealEvent[] = [];
  for (const p of plans) {
    for (const d of p.days) {
      for (const id of [d.mainId, d.sideId, d.soupId]) {
        const dish = getDish(id);
        if (dish) out.push({ date: d.date, dishId: id, name: dish.name, category: dish.category, source: "plan" });
      }
    }
  }
  return out;
}

/** 履歴がある日・区分は履歴を優先し、計画と二重に数えない */
export function mergeEvents(history: MealEvent[], plans: MealEvent[]): MealEvent[] {
  const key = (e: MealEvent) => `${e.date}|${e.category}`;
  const recorded = new Set(history.map(key));
  // 「作らなかった」記録がある日は計画も数えない
  return [...history, ...plans.filter((p) => !recorded.has(key(p)))];
}

/** 献立生成・検証に使う記録一式（履歴＋保存済みの計画） */
export function buildContext(history: HistoryEntry[], plans: WeekPlan[]): MealEvent[] {
  const recorded = new Set(history.map((h) => `${h.date}|${h.category}`));
  return [
    ...eventsFromHistory(history),
    ...eventsFromPlans(plans).filter((p) => !recorded.has(`${p.date}|${p.category}`)),
  ];
}

export function eventDish(e: MealEvent): Dish | undefined {
  return e.dishId ? getDish(e.dishId) : undefined;
}

/** 同じ料理（ID・正規化名・類似グループ・表記揺れ）か */
const sameCache = new Map<string, boolean>();

export function isSameDish(a: { dishId: string | null; name: string }, b: Dish): boolean {
  if (a.dishId && a.dishId === b.id) return true;
  const key = `${a.dishId ?? ""}|${a.name}|${b.id}`;
  let v = sameCache.get(key);
  if (v === undefined) {
    v = computeSameDish(a, b);
    sameCache.set(key, v);
  }
  return v;
}

function computeSameDish(a: { dishId: string | null; name: string }, b: Dish): boolean {
  const da = a.dishId ? getDish(a.dishId) : undefined;
  if (da) {
    if (da.normalizedName === b.normalizedName) return true;
    if (da.group && da.group === b.group) return true;
  }
  return isSameDishName(a.name, b.name);
}

/** マスタの料理はフラグで、マスタにない料理（手入力）は名前で判定する */
function eventFlag(e: MealEvent, f: (d: Dish) => boolean, nameRe: RegExp): boolean {
  const d = eventDish(e);
  return d ? f(d) : nameRe.test(e.name.replace(/油揚げ|厚揚げ/g, ""));
}

export const isFriedEvent = (e: MealEvent) => eventFlag(e, (d) => d.isFried, /揚|フライ|カツ|かつ|天ぷら|天麩羅/);
export const isPastaEvent = (e: MealEvent) =>
  eventFlag(e, (d) => d.isPasta, /パスタ|スパゲ|ペペロンチーノ|カルボナーラ|ペンネ|マカロニ/);
export const isFishEvent = (e: MealEvent) =>
  eventFlag(e, (d) => d.isFish, /鮭|さけ|サーモン|サバ|鯖|アジ|鯵|ブリ|鰤|タラ|鱈|イワシ|鰯|サンマ|秋刀魚|カジキ|魚/);

/** date の前後 window 日以内(0 < |差| < window+1 ではなく、|差| < window)にある記録 */
export function eventsNear(events: MealEvent[], date: string, window: number): MealEvent[] {
  return events.filter((e) => {
    const diff = Math.abs(diffDays(e.date, date));
    return diff > 0 && diff < window;
  });
}

/** 料理 dish を date に入れると14日以内の重複になる記録 */
export function duplicateConflicts(events: MealEvent[], date: string, dish: Dish): MealEvent[] {
  return events.filter((e) => {
    const diff = Math.abs(diffDays(e.date, date));
    return diff > 0 && diff <= NO_REPEAT_DAYS && isSameDish(e, dish);
  });
}

/** date に揚げ物を入れてよいか（前後14日間に他の揚げ物がない） */
export function friedAllowed(events: MealEvent[], date: string): boolean {
  return !eventsNear(events, date, FRIED_INTERVAL_DAYS).some(isFriedEvent);
}

export function pastaAllowed(events: MealEvent[], date: string): boolean {
  return !eventsNear(events, date, PASTA_INTERVAL_DAYS).some(isPastaEvent);
}

/** 主菜のタンパク源の系統（前日と同じ系統を避けるため） */
export function proteinGroup(d: Dish): string {
  if (d.isFish) return "魚";
  const m = d.mainIngredient;
  if (m.startsWith("鶏")) return "鶏";
  if (m.startsWith("豚") || m === "ベーコン" || m === "ハム") return "豚";
  if (m.startsWith("牛") || m === "合いびき肉") return "牛";
  if (m === "卵") return "卵";
  if (["木綿豆腐", "絹ごし豆腐", "厚揚げ", "油揚げ", "納豆", "大豆水煮", "高野豆腐"].includes(m)) return "大豆";
  if (m === "むきエビ" || m === "イカ") return "エビ・イカ";
  return m;
}
