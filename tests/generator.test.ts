import { describe, expect, it } from "vitest";
import { addDays, mondayOf, weekDates } from "@/lib/dates";
import { generatePlan } from "@/lib/generator";
import { eventsFromHistory, eventsFromPlans, mergeEvents, type MealEvent } from "@/lib/rules";
import { errorCount, validateWeek } from "@/lib/validator";
import { DEFAULT_SETTINGS, type HistoryEntry, type Settings, type WeekPlan } from "@/lib/types";
import { getDish } from "@/lib/dishes";

function planToHistory(plan: WeekPlan): HistoryEntry[] {
  return plan.days.flatMap((d) =>
    [d.mainId, d.sideId, d.soupId].map((id, i) => ({
      id: `${d.date}-${i}`,
      date: d.date,
      dishId: id,
      dishName: getDish(id)!.name,
      category: getDish(id)!.category,
      servings: 2,
      made: true,
    })),
  );
}

function simulate(start: string, weeks: number, settings: Settings = DEFAULT_SETTINGS, seed = 1) {
  let history: HistoryEntry[] = [];
  const results = [];
  let weekStart = mondayOf(start);
  for (let w = 0; w < weeks; w++) {
    const context: MealEvent[] = mergeEvents(eventsFromHistory(history), []);
    const r = generatePlan({
      dates: weekDates(weekStart),
      weekStart,
      keptDays: [],
      context,
      settings,
      seed: seed + w,
    });
    results.push(r);
    history = [...history, ...planToHistory(r.plan)];
    weekStart = addDays(weekStart, 7);
  }
  return results;
}

describe("献立の自動生成", () => {
  for (let month = 1; month <= 12; month++) {
    it(`${month}月から8週間連続で生成しても必須条件をすべて満たす`, () => {
      const start = `2026-${String(month).padStart(2, "0")}-01`;
      const results = simulate(start, 8, DEFAULT_SETTINGS, month * 100);
      for (const r of results) {
        const failed = r.checks.filter((c) => !c.ok && c.severity === "error");
        expect(failed, `${r.plan.weekStart}: ${JSON.stringify(failed)}`).toEqual([]);
        expect(r.plan.days).toHaveLength(7);
      }
    });
  }

  it("パスタは14日間に1回のペースで提案される", () => {
    const results = simulate("2026-10-05", 6);
    const pastaDays = results.flatMap((r) => r.plan.days.filter((d) => getDish(d.mainId)!.isPasta).map((d) => d.date));
    expect(pastaDays.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < pastaDays.length; i++) {
      const gap = (Date.parse(pastaDays[i]) - Date.parse(pastaDays[i - 1])) / 86400000;
      expect(gap).toBeGreaterThanOrEqual(14);
    }
  });

  it("揚げ物は14日間に1回のペースで提案される", () => {
    const results = simulate("2026-10-05", 4);
    const fried = results.flatMap((r) => r.plan.days.filter((d) => getDish(d.mainId)!.isFried));
    expect(fried.length).toBeGreaterThanOrEqual(2);
    expect(results.every((r) => r.plan.days.every((d) => d.notes.length === 0))).toBe(true);
  });

  it("揚げ鍋がない設定では揚げ物を提案しない", () => {
    const settings = { ...DEFAULT_SETTINGS, equipment: DEFAULT_SETTINGS.equipment.filter((e) => e !== "揚げ鍋") };
    const results = simulate("2026-10-05", 3, settings);
    for (const r of results) {
      expect(r.plan.days.some((d) => getDish(d.mainId)!.isFried)).toBe(false);
    }
  });

  it("アレルギー食材を含む料理を提案しない", () => {
    const settings = { ...DEFAULT_SETTINGS, allergies: ["卵", "えび"] };
    const results = simulate("2026-10-05", 3, settings);
    for (const r of results) expect(errorCount(r.checks)).toBe(0);
  });

  it("魚アレルギーで魚料理を出せない場合は理由を明示する", () => {
    const settings = { ...DEFAULT_SETTINGS, allergies: ["魚類"] };
    const [r] = simulate("2026-10-05", 1, settings);
    const fish = r.checks.find((c) => c.id === "fish")!;
    expect(fish.ok).toBe(false);
    expect(fish.details.join()).toMatch(/魚料理の候補がない/);
  });

  it("1日だけ作り直しても他の日は変わらない", () => {
    const weekStart = "2026-10-26";
    const first = generatePlan({ dates: weekDates(weekStart), weekStart, keptDays: [], context: [], settings: DEFAULT_SETTINGS, seed: 5 });
    const target = first.plan.days[2].date;
    const context = eventsFromPlans([first.plan]);
    const again = generatePlan({
      dates: [target],
      weekStart,
      keptDays: first.plan.days,
      context,
      settings: DEFAULT_SETTINGS,
      seed: 99,
    });
    for (const d of again.plan.days) {
      if (d.date !== target) expect(d).toEqual(first.plan.days.find((x) => x.date === d.date));
    }
    expect(errorCount(again.checks)).toBe(0);
  });
});

describe("品質チェック（プログラム検証）", () => {
  const weekStart = "2026-10-26";
  const base = generatePlan({ dates: weekDates(weekStart), weekStart, keptDays: [], context: [], settings: DEFAULT_SETTINGS, seed: 3 }).plan;

  it("14日以内の重複を検出する（表記揺れの履歴も含む）", () => {
    const main = getDish(base.days[0].mainId)!;
    const context: MealEvent[] = [
      { date: addDays(weekStart, -5), dishId: null, name: main.name.replace("の", "肉の"), category: "主菜", source: "history" },
    ];
    const r = validateWeek(base, context, DEFAULT_SETTINGS).find((c) => c.id === "duplicate")!;
    expect(r.ok).toBe(false);
  });

  it("揚げ物が14日以内に2回あると検出する", () => {
    const plan: WeekPlan = { ...base, days: base.days.map((d, i) => (i < 2 ? { ...d, mainId: i === 0 ? "m015" : "m016" } : d)) };
    const r = validateWeek(plan, [], DEFAULT_SETTINGS).find((c) => c.id === "fried")!;
    expect(r.ok).toBe(false);
  });

  it("前週のパスタと14日以内なら検出する", () => {
    const pastaInPlan = base.days.find((d) => getDish(d.mainId)!.isPasta);
    const plan = pastaInPlan ? base : { ...base, days: base.days.map((d, i) => (i === 0 ? { ...d, mainId: "p001" } : d)) };
    const date = (pastaInPlan ?? plan.days[0]).date;
    const context: MealEvent[] = [{ date: addDays(date, -10), dishId: "p004", name: "ミートソーススパゲッティ", category: "主菜", source: "history" }];
    expect(validateWeek(plan, context, DEFAULT_SETTINGS).find((c) => c.id === "pasta")!.ok).toBe(false);
  });

  it("魚料理がない週を検出する", () => {
    const plan: WeekPlan = { ...base, days: base.days.map((d) => (getDish(d.mainId)!.isFish ? { ...d, mainId: "m001" } : d)) };
    expect(validateWeek(plan, [], DEFAULT_SETTINGS).find((c) => c.id === "fish")!.ok).toBe(false);
  });

  it("汁物が欠けていると検出する", () => {
    const plan: WeekPlan = { ...base, days: base.days.map((d, i) => (i === 0 ? { ...d, soupId: "" } : d)) };
    expect(validateWeek(plan, [], DEFAULT_SETTINGS).find((c) => c.id === "set")!.ok).toBe(false);
  });

  it("作らなかった記録がある日は計画を数えない", () => {
    const planEvents = eventsFromPlans([base]);
    const notMade: MealEvent[] = [];
    const merged = mergeEvents(notMade, planEvents);
    expect(merged.length).toBe(21);
  });
});

describe("手入力の履歴の判定", () => {
  it("「油揚げ」「厚揚げ」を含む料理を揚げ物と誤判定しない", async () => {
    const { isFriedEvent } = await import("@/lib/rules");
    const ev = (name: string): MealEvent => ({ date: "2026-10-01", dishId: null, name, category: "主菜", source: "history" });
    expect(isFriedEvent(ev("厚揚げの煮物"))).toBe(false);
    expect(isFriedEvent(ev("小松菜と油揚げの煮びたし"))).toBe(false);
    expect(isFriedEvent(ev("エビフライ"))).toBe(true);
    expect(isFriedEvent(ev("鶏のから揚げ"))).toBe(true);
  });
});

describe("食材リスト", () => {
  it("食材リストにある食材で作れる料理を優先する", async () => {
    const { pantryCoverage } = await import("@/lib/pantry");
    const weekStart = "2026-10-26";
    const pantry = ["鶏むね肉", "ブロッコリー", "しめじ", "卵", "玉ねぎ", "木綿豆腐", "絹ごし豆腐", "乾燥わかめ", "青ねぎ", "にんじん"];
    const ratio = (p: string[]) => {
      const set = new Set(pantry);
      let sum = 0;
      for (let seed = 1; seed <= 5; seed++) {
        const r = generatePlan({ dates: weekDates(weekStart), weekStart, keptDays: [], context: [], settings: DEFAULT_SETTINGS, seed, pantry: p });
        expect(errorCount(r.checks)).toBe(0);
        for (const d of r.plan.days) for (const id of [d.mainId, d.sideId, d.soupId]) sum += pantryCoverage(getDish(id)!, set).ratio;
      }
      return sum;
    };
    expect(ratio(pantry)).toBeGreaterThan(ratio([]) * 1.3);
  });

  it("食材リストがあっても必須条件は守る（重複・揚げ物・魚）", () => {
    const results = simulate("2026-10-05", 3, DEFAULT_SETTINGS, 7);
    const pantry = ["鶏もも肉", "片栗粉", "サバ", "生鮭"];
    const r = generatePlan({
      dates: weekDates("2026-10-26"),
      weekStart: "2026-10-26",
      keptDays: [],
      context: eventsFromPlans(results.map((x) => x.plan)),
      settings: DEFAULT_SETTINGS,
      seed: 1,
      pantry,
    });
    expect(errorCount(r.checks)).toBe(0);
  });
});
