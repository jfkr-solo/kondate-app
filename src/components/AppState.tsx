"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDish } from "@/lib/dishes";
import { mondayOf, todayStr, weekDates } from "@/lib/dates";
import { type DayType, dayTypeOf, generatePlan } from "@/lib/generator";
import { buildContext } from "@/lib/rules";
import {
  loadAll,
  newId,
  saveHistory,
  savePlans,
  saveSettings,
  saveShoppingChecks,
} from "@/lib/storage";
import { type CheckResult, validateWeek } from "@/lib/validator";
import { DEFAULT_SETTINGS, type HistoryEntry, type Settings, type WeekPlan } from "@/lib/types";

interface AppState {
  ready: boolean;
  today: string;
  settings: Settings;
  history: HistoryEntry[];
  plans: WeekPlan[];
  shoppingChecks: Record<string, boolean>;
  planFor: (weekStart: string) => WeekPlan | undefined;
  checksFor: (weekStart: string) => CheckResult[] | undefined;
  generateWeek: (...weekStarts: string[]) => string | null;
  regenerateDay: (date: string) => string | null;
  recordDay: (date: string, made: boolean) => void;
  addHistory: (entry: Omit<HistoryEntry, "id">) => void;
  updateHistory: (id: string, patch: Partial<HistoryEntry>) => void;
  deleteHistory: (id: string) => void;
  setSettings: (s: Settings) => void;
  toggleShopping: (key: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppProvider がありません");
  return v;
}

/** 過ぎた日の献立で記録がないものは「作った」として自動記録する */
function autoRecord(history: HistoryEntry[], plans: WeekPlan[], today: string, servings: number): HistoryEntry[] {
  const recordedDates = new Set(history.map((h) => h.date));
  const added: HistoryEntry[] = [];
  for (const p of plans) {
    for (const d of p.days) {
      if (d.date >= today || recordedDates.has(d.date)) continue;
      for (const id of [d.mainId, d.sideId, d.soupId]) {
        const dish = getDish(id);
        if (!dish) continue;
        added.push({ id: newId(), date: d.date, dishId: id, dishName: dish.name, category: dish.category, servings, made: true, auto: true });
      }
    }
  }
  return added.length ? [...history, ...added] : history;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [plans, setPlans] = useState<WeekPlan[]>([]);
  const [shoppingChecks, setShoppingChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = todayStr();
    const data = loadAll();
    const h = autoRecord(data.history, data.plans, t, data.settings.servings);
    if (h !== data.history) saveHistory(h);
    setToday(t);
    setSettingsState(data.settings);
    setHistory(h);
    setPlans(data.plans);
    setShoppingChecks(data.shoppingChecks);
    setReady(true);
  }, []);

  const updatePlans = useCallback((next: WeekPlan[]) => {
    setPlans(next);
    savePlans(next);
  }, []);
  const updateHistoryList = useCallback((next: HistoryEntry[]) => {
    setHistory(next);
    saveHistory(next);
  }, []);

  const planFor = useCallback((ws: string) => plans.find((p) => p.weekStart === ws), [plans]);

  const checksFor = useCallback(
    (ws: string) => {
      const plan = plans.find((p) => p.weekStart === ws);
      if (!plan || plan.days.length === 0) return undefined;
      const others = plans.filter((p) => p.weekStart !== ws);
      return validateWeek(plan, buildContext(history, others), settings);
    },
    [plans, history, settings],
  );

  const generateWeek = useCallback(
    (...weekStarts: string[]): string | null => {
      let current = plans;
      const recorded = new Set(history.map((h) => h.date));
      for (const ws of weekStarts) {
        const existing = current.find((p) => p.weekStart === ws);
        // 過ぎた日・記録済みの日は作り直さない
        const dates = weekDates(ws).filter((d) => d >= today && !recorded.has(d));
        if (dates.length === 0) return "この週は作り直せる日がありません。";
        const kept = existing?.days.filter((d) => !dates.includes(d.date)) ?? [];
        const others = current.filter((p) => p.weekStart !== ws);
        try {
          const r = generatePlan({
            dates,
            weekStart: ws,
            keptDays: kept,
            context: buildContext(history, others),
            settings,
          });
          current = [...others, r.plan].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
        } catch (e) {
          return e instanceof Error ? e.message : "献立を作成できませんでした。";
        }
      }
      updatePlans(current);
      return null;
    },
    [plans, history, settings, today, updatePlans],
  );

  const regenerateDay = useCallback(
    (date: string): string | null => {
      const ws = mondayOf(date);
      const existing = plans.find((p) => p.weekStart === ws);
      const day = existing?.days.find((d) => d.date === date);
      const types = new Map<string, DayType>([[date, day ? dayTypeOf(day) : "normal"]]);
      const others = plans.filter((p) => p.weekStart !== ws);
      try {
        const r = generatePlan({
          dates: [date],
          weekStart: ws,
          keptDays: existing?.days ?? [],
          context: buildContext(history.filter((h) => h.date !== date), [...others, ...(existing ? [existing] : [])]),
          settings,
          forcedTypes: types,
        });
        updatePlans([...others, r.plan].sort((a, b) => a.weekStart.localeCompare(b.weekStart)));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "献立を作成できませんでした。";
      }
    },
    [plans, history, settings, updatePlans],
  );

  const recordDay = useCallback(
    (date: string, made: boolean) => {
      const plan = plans.find((p) => p.weekStart === mondayOf(date));
      const day = plan?.days.find((d) => d.date === date);
      if (!day) return;
      const rest = history.filter((h) => h.date !== date);
      const entries: HistoryEntry[] = [day.mainId, day.sideId, day.soupId].flatMap((id) => {
        const dish = getDish(id);
        return dish
          ? [{ id: newId(), date, dishId: id, dishName: dish.name, category: dish.category, servings: settings.servings, made }]
          : [];
      });
      updateHistoryList([...rest, ...entries]);
    },
    [plans, history, settings.servings, updateHistoryList],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      today,
      settings,
      history,
      plans,
      shoppingChecks,
      planFor,
      checksFor,
      generateWeek,
      regenerateDay,
      recordDay,
      addHistory: (entry) => updateHistoryList([...history, { ...entry, id: newId() }]),
      updateHistory: (id, patch) => updateHistoryList(history.map((h) => (h.id === id ? { ...h, ...patch } : h))),
      deleteHistory: (id) => updateHistoryList(history.filter((h) => h.id !== id)),
      setSettings: (s) => {
        setSettingsState(s);
        saveSettings(s);
      },
      toggleShopping: (key) => {
        const next = { ...shoppingChecks, [key]: !shoppingChecks[key] };
        setShoppingChecks(next);
        saveShoppingChecks(next);
      },
    }),
    [ready, today, settings, history, plans, shoppingChecks, planFor, checksFor, generateWeek, regenerateDay, recordDay, updateHistoryList],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
