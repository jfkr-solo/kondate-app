// 献立の品質チェック（プログラムによる検証）
// 提案ロジック(generator)とは独立しており、どんな提案方法の結果でも同じ基準で検証する。

import { getDish } from "./dishes";
import { diffDays, formatDate, monthOf } from "./dates";
import {
  dishCost,
  proteinPerServing,
  riceCost,
  riceProteinPerServing,
  seasonalIngredientsOf,
  settingsConflict,
} from "./nutrition";
import {
  FISH_MIN_PER_WEEK,
  MAX_SAME_GENRE_PER_WEEK,
  MAX_SAME_METHOD_PER_WEEK,
  type MealEvent,
  duplicateConflicts,
  eventsFromPlans,
  isFishEvent,
  isFriedEvent,
  isPastaEvent,
  FRIED_INTERVAL_DAYS,
  PASTA_INTERVAL_DAYS,
} from "./rules";
import type { DayPlan, Dish, Settings, WeekPlan } from "./types";

export interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  severity: "error" | "warn";
  details: string[];
}

export function dayDishes(day: DayPlan): (Dish | undefined)[] {
  return [getDish(day.mainId), getDish(day.sideId), getDish(day.soupId)];
}

/** 1日分のタンパク質（1人あたり、ご飯を含む） */
export function dayProtein(day: DayPlan): number {
  const [main, side, soup] = dayDishes(day);
  const rice = main?.isPasta ? 0 : riceProteinPerServing();
  const total = [main, side, soup].reduce((s, d) => s + (d ? proteinPerServing(d) : 0), rice);
  return Math.round(total * 10) / 10;
}

export function dayCost(day: DayPlan, servings: number): number {
  const [main, side, soup] = dayDishes(day);
  const rice = main?.isPasta ? 0 : riceCost(servings);
  return [main, side, soup].reduce((s, d) => s + (d ? dishCost(d, servings) : 0), rice);
}

function check(id: string, label: string, severity: "error" | "warn", details: string[]): CheckResult {
  return { id, label, ok: details.length === 0, severity, details };
}

/**
 * @param plan 検証する週の献立
 * @param context 履歴(作った料理)と他の週の計画。plan 自身は含めない
 */
export function validateWeek(plan: WeekPlan, context: MealEvent[], settings: Settings): CheckResult[] {
  const planDates = new Set(plan.days.map((d) => d.date));
  // この週の日付については plan を正とし、context の同じ日付の計画は除く
  const others = context.filter((e) => !(planDates.has(e.date) && e.source === "plan"));
  const own = eventsFromPlans([plan]);
  const all = [...others, ...own];
  const results: CheckResult[] = [];

  // 1. 14日以内の重複
  {
    const details: string[] = [];
    for (const day of plan.days) {
      for (const dish of dayDishes(day)) {
        if (!dish) continue;
        const conflicts = duplicateConflicts(all, day.date, dish);
        // 同じ組を2回報告しないよう、後ろの日付側だけで報告
        const earlier = conflicts.filter((c) => diffDays(c.date, day.date) > 0);
        for (const c of earlier) {
          details.push(`${formatDate(day.date)}「${dish.name}」が ${formatDate(c.date)}「${c.name}」と重複`);
        }
      }
    }
    results.push(check("duplicate", "過去14日以内の料理と重複していない", "error", details));
  }

  // 2/3. 揚げ物・パスタの頻度
  for (const [id, label, pred, interval] of [
    ["fried", "揚げ物は14日間に1回まで", isFriedEvent, FRIED_INTERVAL_DAYS],
    ["pasta", "パスタは14日間に1回まで", isPastaEvent, PASTA_INTERVAL_DAYS],
  ] as const) {
    const hits = all.filter((e) => e.category === "主菜" && pred(e));
    const details: string[] = [];
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        const a = hits[i];
        const b = hits[j];
        if (!planDates.has(a.date) && !planDates.has(b.date)) continue;
        const diff = Math.abs(diffDays(a.date, b.date));
        if (diff > 0 && diff < interval) {
          details.push(`${formatDate(a.date)}「${a.name}」と ${formatDate(b.date)}「${b.name}」の間隔が${diff}日`);
        }
      }
    }
    results.push(check(id, label, "error", details));
  }

  // 4. 魚料理は7日間に1回以上
  {
    const fishDays = all.filter((e) => planDates.has(e.date) && e.category === "主菜" && isFishEvent(e));
    const reasons = plan.days.flatMap((d) => d.notes.filter((n) => n.includes("魚")));
    results.push(
      check(
        "fish",
        "7日間に魚料理が1回以上ある",
        "error",
        fishDays.length >= FISH_MIN_PER_WEEK ? [] : [`魚料理が${fishDays.length}回`, ...reasons],
      ),
    );
  }

  // 5. 主菜・副菜・汁物がそろっている
  {
    const details: string[] = [];
    for (const day of plan.days) {
      const [main, side, soup] = dayDishes(day);
      if (main?.category !== "主菜") details.push(`${formatDate(day.date)} 主菜がない`);
      if (side?.category !== "副菜") details.push(`${formatDate(day.date)} 副菜がない`);
      if (soup?.category !== "汁物") details.push(`${formatDate(day.date)} 汁物がない`);
    }
    results.push(check("set", "主菜・副菜・汁物がそろっている", "error", details));
  }

  // 6. 旬の野菜
  {
    const details: string[] = [];
    for (const day of plan.days) {
      const month = monthOf(day.date);
      const used = dayDishes(day).flatMap((d) => (d ? seasonalIngredientsOf(d, month) : []));
      if (used.length === 0) details.push(`${formatDate(day.date)} 旬の野菜が使われていない`);
    }
    results.push(check("seasonal", "旬の野菜が使われている", "error", details));
  }

  // 7. タンパク質量
  {
    const details: string[] = [];
    for (const day of plan.days) {
      const main = getDish(day.mainId);
      if (!main || proteinPerServing(main) <= 0) details.push(`${formatDate(day.date)} 主菜のタンパク質量が計算できない`);
    }
    results.push(check("protein", "タンパク質量が表示されている", "error", details));

    const low: string[] = [];
    for (const day of plan.days) {
      const p = dayProtein(day);
      if (p < settings.targetProtein * 0.8) low.push(`${formatDate(day.date)} ${p}g（目標${settings.targetProtein}g）`);
    }
    results.push(check("protein-target", "1人あたりのタンパク質が目標の8割以上", "warn", low));
  }

  // 8. ジャンル・調理方法の偏り
  {
    const mains = plan.days.map((d) => getDish(d.mainId)).filter((d): d is Dish => !!d);
    const details: string[] = [];
    const genreCount = countBy(mains, (d) => d.genre);
    for (const [g, n] of Object.entries(genreCount)) {
      if (n > MAX_SAME_GENRE_PER_WEEK) details.push(`主菜の${g}が${n}回（上限${MAX_SAME_GENRE_PER_WEEK}回）`);
    }
    const methodCount = countBy(mains, (d) => d.method);
    for (const [m, n] of Object.entries(methodCount)) {
      if (n > MAX_SAME_METHOD_PER_WEEK) details.push(`主菜の「${m}」が${n}回（上限${MAX_SAME_METHOD_PER_WEEK}回）`);
    }
    if (plan.days.length >= 7) {
      for (const g of ["和食", "中華", "洋食"]) {
        if (!genreCount[g]) details.push(`主菜に${g}がない`);
      }
    }
    results.push(check("balance", "調理方法とジャンルが偏っていない", "warn", details));
  }

  // 9. 材料と作り方が具体的か
  {
    const details: string[] = [];
    for (const day of plan.days) {
      for (const d of dayDishes(day)) {
        if (!d) continue;
        const measured = d.ingredients.filter((l) => l.amount != null).length;
        if (measured < 1 || d.steps.length < 2) details.push(`「${d.name}」の材料・作り方が不足`);
      }
    }
    results.push(check("recipe", "材料と作り方が具体的", "error", details));
  }

  // 10. 設定（アレルギー・苦手・調理器具・調理時間）
  {
    const details: string[] = [];
    for (const day of plan.days) {
      for (const d of dayDishes(day)) {
        if (!d) continue;
        const why = settingsConflict(d, settings);
        if (why) details.push(`${formatDate(day.date)}「${d.name}」: ${why}`);
      }
    }
    results.push(check("settings", "アレルギー・苦手食材・調理器具・時間の設定を守っている", "error", details));
  }

  // 11. 予算
  {
    const details: string[] = [];
    for (const day of plan.days) {
      const c = dayCost(day, settings.servings);
      if (c > settings.budgetPerMeal) details.push(`${formatDate(day.date)} 約${c}円（予算${settings.budgetPerMeal}円）`);
    }
    results.push(check("budget", "1食の予算内に収まる", "warn", details));
  }

  return results;
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of items) out[key(t)] = (out[key(t)] ?? 0) + 1;
  return out;
}

export function errorCount(results: CheckResult[]): number {
  return results.filter((r) => !r.ok && r.severity === "error").reduce((s, r) => s + r.details.length, 0);
}

export function warnCount(results: CheckResult[]): number {
  return results.filter((r) => !r.ok && r.severity === "warn").reduce((s, r) => s + r.details.length, 0);
}
