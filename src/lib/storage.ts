// 端末内(localStorage)への保存。次回起動時も履歴・設定・献立を保持する。

import { DEFAULT_SETTINGS, type HistoryEntry, type Settings, type WeekPlan } from "./types";

const PREFIX = "kondate:v1:";

export interface StoredData {
  settings: Settings;
  history: HistoryEntry[];
  plans: WeekPlan[];
  shoppingChecks: Record<string, boolean>;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 容量不足・プライベートモードなどは無視（画面上の状態は保持される）
  }
}

export function loadAll(): StoredData {
  const settings = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>("settings", {}) };
  // 人数は1〜4人分から選ぶ
  settings.servings = Math.min(4, Math.max(1, Math.round(settings.servings) || DEFAULT_SETTINGS.servings));
  return {
    settings,
    history: read<HistoryEntry[]>("history", []),
    plans: read<WeekPlan[]>("plans", []),
    shoppingChecks: read<Record<string, boolean>>("shopping", {}),
  };
}

export function saveSettings(s: Settings) {
  write("settings", s);
}
export function saveHistory(h: HistoryEntry[]) {
  write("history", h);
}
export function savePlans(p: WeekPlan[]) {
  write("plans", p);
}
export function saveShoppingChecks(c: Record<string, boolean>) {
  write("shopping", c);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
