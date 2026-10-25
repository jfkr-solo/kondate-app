// 献立の提案ロジック
// ここでは候補を「選ぶ」だけで、最終的な合否は validator.ts のプログラムチェックで判定する。
// 将来 AI による提案に差し替える場合も、同じ validateWeek を通してから確定する。

import { DISHES } from "./dishes";
import { diffDays, monthOf, mondayOf } from "./dates";
import {
  dishCost,
  isOutOfSeason,
  mainFoods,
  proteinFoods,
  proteinPerServing,
  seasonalIngredientsOf,
  settingsConflict,
  usesSeasonalFish,
} from "./nutrition";
import {
  FISH_TARGET_PER_WEEK,
  MAX_SAME_GENRE_PER_WEEK,
  MAX_SAME_METHOD_PER_WEEK,
  type MealEvent,
  duplicateConflicts,
  eventDish,
  eventsFromPlans,
  friedAllowed,
  isFishEvent,
  pastaAllowed,
  proteinGroup,
} from "./rules";
import { type CheckResult, errorCount, validateWeek, warnCount } from "./validator";
import type { DayPlan, Dish, Settings, WeekPlan } from "./types";

export type DayType = "fish" | "pasta" | "fried" | "normal";

export function dayTypeOf(day: DayPlan): DayType {
  const main = DISHES.find((d) => d.id === day.mainId);
  if (!main) return "normal";
  if (main.isPasta) return "pasta";
  if (main.isFried) return "fried";
  if (main.isFish) return "fish";
  return "normal";
}

// 再現可能な乱数（同じ seed なら同じ献立）
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 上位3件から重み付きで1件選ぶ（毎回同じ献立にならないように） */
function pickTop<T>(scored: { item: T; score: number }[], rng: Rng): T | undefined {
  if (scored.length === 0) return undefined;
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
  const weights = top.map((_, i) => [0.6, 0.28, 0.12][i]);
  const sum = weights.reduce((s, w) => s + w, 0);
  let r = rng() * sum;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].item;
  }
  return top[0].item;
}

interface FillContext {
  events: MealEvent[]; // 確定済み（履歴＋他の計画＋この週で既に決まった日）
  settings: Settings;
  rng: Rng;
}

function baseFilter(dish: Dish, date: string, ctx: FillContext): boolean {
  if (settingsConflict(dish, ctx.settings)) return false;
  if (isOutOfSeason(dish, monthOf(date))) return false;
  if (duplicateConflicts(ctx.events, date, dish).length > 0) return false;
  return true;
}

/** 同じ週（前後6日以内）の主菜 */
function nearbyMains(events: MealEvent[], date: string): Dish[] {
  return events
    .filter((e) => e.category === "主菜" && Math.abs(diffDays(e.date, date)) < 7 && e.date !== date)
    .map(eventDish)
    .filter((d): d is Dish => !!d);
}

function recentMains(events: MealEvent[], date: string, days: number): Dish[] {
  return events
    .filter((e) => e.category === "主菜" && diffDays(e.date, date) > 0 && diffDays(e.date, date) <= days)
    .map(eventDish)
    .filter((d): d is Dish => !!d);
}

function scoreMain(dish: Dish, date: string, ctx: FillContext): number {
  const month = monthOf(date);
  let s = 0;
  s += Math.min(seasonalIngredientsOf(dish, month).length, 3) * 2;
  if (usesSeasonalFish(dish, month)) s += 3;

  const week = nearbyMains(ctx.events, date);
  const sameGenre = week.filter((d) => d.genre === dish.genre).length;
  s -= sameGenre * 3;
  if (sameGenre >= MAX_SAME_GENRE_PER_WEEK) s -= 20;
  const sameMethod = week.filter((d) => d.method === dish.method).length;
  s -= sameMethod * 2.5;
  if (sameMethod >= MAX_SAME_METHOD_PER_WEEK) s -= 15;
  if (["焼く", "煮る", "炒める"].includes(dish.method)) s += 1.5;
  if (dish.method === "蒸す") s += 1;

  // 直近14日間の調理方法の偏り
  const recent = recentMains(ctx.events, date, 14);
  s -= recent.filter((d) => d.method === dish.method).length * 0.7;

  // 同じタンパク源が続かないように
  const group = proteinGroup(dish);
  const yesterday = recentMains(ctx.events, date, 1)[0];
  const tomorrow = ctx.events
    .filter((e) => e.category === "主菜" && diffDays(date, e.date) === 1)
    .map(eventDish)[0];
  if (yesterday && proteinGroup(yesterday) === group) s -= 6;
  if (tomorrow && proteinGroup(tomorrow) === group) s -= 6;
  s -= week.filter((d) => proteinGroup(d) === group).length * 2;

  // 主菜で目標タンパク質の6割程度を確保したい
  const p = proteinPerServing(dish);
  const want = ctx.settings.targetProtein * 0.6;
  if (p < want) s -= (want - p) * 0.6;

  const cost = dishCost(dish, ctx.settings.servings);
  const allowance = ctx.settings.budgetPerMeal * 0.6;
  if (cost > allowance) s -= (cost - allowance) / 100;

  s += ctx.rng() * 3;
  return s;
}

function scoreSide(dish: Dish, main: Dish, date: string, ctx: FillContext, weekSeasonal: Set<string>): number {
  const month = monthOf(date);
  let s = 0;
  const seasonal = seasonalIngredientsOf(dish, month);
  s += Math.min(seasonal.length, 2) * 2;
  if (seasonalIngredientsOf(main, month).length === 0 && seasonal.length > 0) s += 5;
  // 旬の野菜を週の中で使い回す（使い切り）
  s += Math.min(seasonal.filter((i) => weekSeasonal.has(i.name)).length, 2);

  const targetGenre = main.isPasta ? "洋食" : main.genre;
  if (dish.genre === targetGenre) s += 3;
  if (dish.method === main.method) s -= 3;
  if (dish.flavor === main.flavor) s -= 4;

  const mp = new Set(proteinFoods(main));
  const mf = new Set(mainFoods(main));
  s -= proteinFoods(dish).filter((f) => mp.has(f)).length * 5;
  s -= mainFoods(dish).filter((f) => mf.has(f)).length * 1.5;

  s += proteinPerServing(dish) / 4;
  s += ctx.rng() * 2;
  return s;
}

function scoreSoup(dish: Dish, main: Dish, side: Dish, date: string, ctx: FillContext, weekSeasonal: Set<string>): number {
  const month = monthOf(date);
  let s = 0;
  const seasonal = seasonalIngredientsOf(dish, month);
  s += Math.min(seasonal.length, 2) * 1.5;
  const mealHasSeasonal =
    seasonalIngredientsOf(main, month).length + seasonalIngredientsOf(side, month).length > 0;
  if (!mealHasSeasonal && seasonal.length > 0) s += 6;
  s += Math.min(seasonal.filter((i) => weekSeasonal.has(i.name)).length, 1);

  const targetGenre = main.isPasta ? "洋食" : main.genre;
  if (dish.genre === targetGenre) s += 5;
  if (dish.flavor === main.flavor) s -= 3;
  if (dish.flavor === side.flavor) s -= 2;

  const used = new Set([...mainFoods(main), ...mainFoods(side)]);
  const usedProtein = new Set([...proteinFoods(main), ...proteinFoods(side)]);
  s -= proteinFoods(dish).filter((f) => usedProtein.has(f)).length * 3;
  s -= mainFoods(dish).filter((f) => used.has(f)).length * 1;
  s += ctx.rng() * 2;
  return s;
}

function mainMatchesType(d: Dish, type: DayType): boolean {
  switch (type) {
    case "pasta":
      return d.isPasta;
    case "fried":
      return d.isFried && !d.isPasta;
    case "fish":
      return d.isFish && !d.isFried && !d.isPasta;
    case "normal":
      return !d.isFish && !d.isFried && !d.isPasta;
  }
}

const TYPE_LABEL: Record<DayType, string> = { fish: "魚料理", pasta: "パスタ", fried: "揚げ物", normal: "通常" };

function pickMain(date: string, type: DayType, ctx: FillContext, notes: string[]): Dish | undefined {
  const mains = DISHES.filter((d) => d.category === "主菜" && baseFilter(d, date, ctx));
  const allowedByFreq = (d: Dish) =>
    (!d.isFried || friedAllowed(ctx.events, date)) && (!d.isPasta || pastaAllowed(ctx.events, date));

  const tryTypes: DayType[] = type === "normal" ? ["normal", "fish"] : [type, "normal", "fish"];
  for (const t of tryTypes) {
    const cands = mains.filter((d) => mainMatchesType(d, t) && allowedByFreq(d));
    if (cands.length > 0) {
      if (t !== type) {
        notes.push(`${TYPE_LABEL[type]}の候補がないため${TYPE_LABEL[t]}にしました（設定や14日以内の重複で除外）`);
      }
      return pickTop(cands.map((d) => ({ item: d, score: scoreMain(d, date, ctx) })), ctx.rng);
    }
  }

  // 14日以内の重複しか残っていない：最も前に作った料理を使い、候補不足を通知
  const fallback = DISHES.filter(
    (d) =>
      d.category === "主菜" &&
      !settingsConflict(d, ctx.settings) &&
      !isOutOfSeason(d, monthOf(date)) &&
      mainMatchesType(d, "normal"),
  );
  const oldest = leastRecent(fallback, date, ctx.events);
  if (oldest) notes.push(`主菜の候補が不足しているため、14日以内に作った「${oldest.name}」を再提案しています`);
  return oldest;
}

function leastRecent(dishes: Dish[], date: string, events: MealEvent[]): Dish | undefined {
  let best: Dish | undefined;
  let bestGap = -1;
  for (const d of dishes) {
    const conflicts = duplicateConflicts(events, date, d);
    const gap = conflicts.length === 0 ? 999 : Math.min(...conflicts.map((c) => Math.abs(diffDays(c.date, date))));
    if (gap > bestGap) {
      best = d;
      bestGap = gap;
    }
  }
  return best;
}

function pickSub(
  category: "副菜" | "汁物",
  date: string,
  ctx: FillContext,
  notes: string[],
  score: (d: Dish) => number,
): Dish | undefined {
  const cands = DISHES.filter((d) => d.category === category && baseFilter(d, date, ctx));
  if (cands.length > 0) return pickTop(cands.map((d) => ({ item: d, score: score(d) })), ctx.rng);
  const fallback = DISHES.filter(
    (d) => d.category === category && !settingsConflict(d, ctx.settings) && !isOutOfSeason(d, monthOf(date)),
  );
  const oldest = leastRecent(fallback, date, ctx.events);
  if (oldest) notes.push(`${category}の候補が不足しているため、14日以内に作った「${oldest.name}」を再提案しています`);
  return oldest;
}

function fillDay(date: string, type: DayType, ctx: FillContext, weekSeasonal: Set<string>): DayPlan {
  const notes: string[] = [];
  const main = pickMain(date, type, ctx, notes);
  if (!main) throw new Error("主菜の候補がありません。設定(アレルギー・調理器具・時間)を見直してください。");
  const mainEvent: MealEvent = { date, dishId: main.id, name: main.name, category: "主菜", source: "plan" };
  ctx.events.push(mainEvent);
  const side = pickSub("副菜", date, ctx, notes, (d) => scoreSide(d, main, date, ctx, weekSeasonal));
  if (!side) throw new Error("副菜の候補がありません。設定を見直してください。");
  ctx.events.push({ date, dishId: side.id, name: side.name, category: "副菜", source: "plan" });
  const soup = pickSub("汁物", date, ctx, notes, (d) => scoreSoup(d, main, side, date, ctx, weekSeasonal));
  if (!soup) throw new Error("汁物の候補がありません。設定を見直してください。");
  ctx.events.push({ date, dishId: soup.id, name: soup.name, category: "汁物", source: "plan" });
  const month = monthOf(date);
  for (const d of [main, side, soup]) for (const i of seasonalIngredientsOf(d, month)) weekSeasonal.add(i.name);
  return { date, mainId: main.id, sideId: side.id, soupId: soup.id, notes };
}

/** 各日の種類（魚・パスタ・揚げ物・通常）を先に割り当てる */
function assignDayTypes(dates: string[], fixed: MealEvent[], settings: Settings, rng: Rng): Map<string, DayType> {
  const types = new Map<string, DayType>(dates.map((d) => [d, "normal" as DayType]));
  const events = [...fixed];
  const free = () => dates.filter((d) => types.get(d) === "normal");

  // パスタ：14日間に1回
  const pastaOk = free().filter((d) => pastaAllowed(events, d));
  if (pastaOk.length > 0) {
    const d = pastaOk[Math.floor(rng() * Math.min(pastaOk.length, 4))];
    types.set(d, "pasta");
    events.push({ date: d, dishId: null, name: "パスタ", category: "主菜", source: "plan" });
  }

  // 揚げ物：14日間に1回まで（揚げ鍋がない場合は提案しない）
  if (settings.equipment.includes("揚げ鍋")) {
    const friedOk = free().filter((d) => friedAllowed(events, d));
    if (friedOk.length > 0) {
      const d = friedOk[Math.floor(rng() * friedOk.length)];
      types.set(d, "fried");
    }
  }

  // 魚：週の前半と後半に分けて目標2回（最低1回）
  const weeks = new Map<string, string[]>();
  for (const d of dates) {
    const w = mondayOf(d);
    weeks.set(w, [...(weeks.get(w) ?? []), d]);
  }
  for (const [w, wDates] of weeks) {
    const already = fixed.filter(
      (e) => e.category === "主菜" && mondayOf(e.date) === w && !wDates.includes(e.date) && isFishEvent(e),
    ).length;
    const need = Math.max(0, FISH_TARGET_PER_WEEK - already);
    const cands = wDates.filter((d) => types.get(d) === "normal");
    if (need === 0 || cands.length === 0) continue;
    const half = Math.ceil(cands.length / 2);
    const groups = need >= 2 && cands.length >= 2 ? [cands.slice(0, half), cands.slice(half)] : [cands];
    for (const g of groups.slice(0, need)) {
      types.set(shuffle(g, rng)[0], "fish");
    }
  }
  return types;
}

export interface GenerateInput {
  dates: string[]; // 献立を作る日付
  weekStart: string;
  keptDays: DayPlan[]; // この週で作り直さない日
  context: MealEvent[]; // 履歴＋他の週の計画
  settings: Settings;
  seed?: number;
  forcedTypes?: Map<string, DayType>; // 1日だけ再提案する場合など
}

export interface GenerateResult {
  plan: WeekPlan;
  checks: CheckResult[];
  attempts: number;
}

/** 条件を満たす献立を探す。複数回試し、プログラムチェックで最もよいものを返す */
export function generatePlan(input: GenerateInput, maxAttempts = 40): GenerateResult {
  const baseSeed = input.seed ?? Math.floor(Math.random() * 1e9);
  const dates = [...input.dates].sort();
  let best: { result: GenerateResult; rank: number } | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = baseSeed + attempt * 7919;
    const rng = mulberry32(seed);
    const kept = input.keptDays.filter((d) => !dates.includes(d.date));
    const keptEvents = eventsFromPlans([{ weekStart: input.weekStart, days: kept, generatedAt: "", seed: 0 }]);
    const fixed = [...input.context.filter((e) => !dates.includes(e.date) || e.source === "history"), ...keptEvents];
    const types = input.forcedTypes ?? assignDayTypes(dates, fixed, input.settings, rng);
    const ctx: FillContext = { events: [...fixed], settings: input.settings, rng };
    const weekSeasonal = new Set<string>();

    // 魚・パスタ・揚げ物の日を先に埋める（候補が少ないため）
    const order = [...dates].sort((a, b) => {
      const pa = types.get(a) === "normal" ? 1 : 0;
      const pb = types.get(b) === "normal" ? 1 : 0;
      return pa - pb || a.localeCompare(b);
    });
    const filled = new Map<string, DayPlan>();
    for (const date of order) filled.set(date, fillDay(date, types.get(date) ?? "normal", ctx, weekSeasonal));

    const days = [...kept, ...filled.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const plan: WeekPlan = { weekStart: input.weekStart, days, generatedAt: new Date().toISOString(), seed };
    const checks = validateWeek(plan, input.context, input.settings);
    const rank = errorCount(checks) * 100 + warnCount(checks);
    const result = { plan, checks, attempts: attempt + 1 };
    if (!best || rank < best.rank) best = { result, rank };
    if (errorCount(checks) === 0 && warnCount(checks) <= 1) break;
  }
  return best!.result;
}
