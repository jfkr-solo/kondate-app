"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppState";
import { GenreBadge } from "@/components/DishView";
import { DISHES, getDish } from "@/lib/dishes";
import { diffDays, formatDate } from "@/lib/dates";
import { mainFoods } from "@/lib/nutrition";
import { normalizeDishName, isSameDishName } from "@/lib/normalize";
import { NO_REPEAT_DAYS } from "@/lib/rules";
import type { Category } from "@/lib/types";

const CATEGORIES: Category[] = ["主菜", "副菜", "汁物"];

export default function HistoryPage() {
  const app = useApp();
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<Category>("主菜");
  const [name, setName] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, typeof app.history>();
    for (const h of [...app.history].sort((a, b) => b.date.localeCompare(a.date))) {
      map.set(h.date, [...(map.get(h.date) ?? []), h]);
    }
    return [...map.entries()];
  }, [app.history]);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  // 入力した料理名を料理マスタと照合（表記揺れも吸収）
  const matched = name.trim()
    ? DISHES.find((d) => d.normalizedName === normalizeDishName(name)) ??
      DISHES.find((d) => isSameDishName(d.name, name))
    : undefined;

  const add = () => {
    if (!date || !name.trim()) return;
    app.addHistory({
      date,
      dishId: matched?.id ?? null,
      dishName: matched?.name ?? name.trim(),
      category: matched?.category ?? category,
      servings: app.settings.servings,
      made: true,
    });
    setName("");
  };

  const recent = app.history.filter((h) => h.made && diffDays(h.date, app.today) >= 0 && diffDays(h.date, app.today) <= NO_REPEAT_DAYS);
  const methodCount = new Map<string, number>();
  for (const h of recent) {
    const d = h.dishId ? getDish(h.dishId) : undefined;
    if (d && d.category === "主菜") methodCount.set(d.method, (methodCount.get(d.method) ?? 0) + 1);
  }

  return (
    <>
      <h1>献立履歴</h1>
      <div className="card">
        <p className="muted small" style={{ marginTop: 0 }}>
          過去{NO_REPEAT_DAYS}日以内に作った料理（{recent.length}品）は再提案しません。
        </p>
        {methodCount.size > 0 && (
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="small">直近14日の主菜の調理方法：</span>
            {[...methodCount.entries()].map(([m, n]) => (
              <span key={m} className="badge">
                {m} {n}
              </span>
            ))}
          </div>
        )}
      </div>

      <details className="card">
        <summary>手動で記録を追加</summary>
        <label className="field">
          <span>日付</span>
          <input type="date" value={date} max={app.today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>料理名</span>
          <input type="text" value={name} list="dish-names" placeholder="例：鶏肉の照焼き" onChange={(e) => setName(e.target.value)} />
          <datalist id="dish-names">
            {DISHES.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>
          {name.trim() && (
            <span className="muted small" style={{ fontWeight: 400 }}>
              {matched ? `料理マスタの「${matched.name}」として記録します` : "料理マスタにない料理として記録します（名前で重複判定）"}
            </span>
          )}
        </label>
        {!matched && (
          <label className="field">
            <span>料理区分</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn" disabled={!date || !name.trim()} onClick={add}>
          追加
        </button>
      </details>

      {grouped.length === 0 && <p className="muted">まだ記録がありません。「今日」の画面で「作った」を押すと記録されます。</p>}

      {grouped.map(([d, entries]) => {
        const age = diffDays(d, app.today);
        return (
          <div key={d} className="card">
            <div className="row spread">
              <strong>{formatDate(d)}</strong>
              {age >= 0 && age <= NO_REPEAT_DAYS && <span className="badge accent">再提案しない期間</span>}
            </div>
            {entries
              .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
              .map((h) => {
                const dish = h.dishId ? getDish(h.dishId) : undefined;
                return (
                  <div key={h.id} className="check">
                    <input
                      type="checkbox"
                      checked={h.made}
                      aria-label="実際に作った"
                      onChange={(e) => app.updateHistory(h.id, { made: e.target.checked })}
                      style={{ width: 20, height: 20, marginTop: 4 }}
                    />
                    <div className="grow">
                      <div className="row wrap" style={{ gap: 6 }}>
                        <span style={{ fontWeight: 600, textDecoration: h.made ? "none" : "line-through" }}>{h.dishName}</span>
                        <span className="badge">{h.category}</span>
                        {dish && <GenreBadge genre={dish.genre} />}
                        {dish && <span className="badge">{dish.method}</span>}
                        {h.auto && <span className="badge">自動記録</span>}
                      </div>
                      {dish && <div className="muted small">食材：{mainFoods(dish).join("、")}</div>}
                    </div>
                    <button className="btn ghost small" onClick={() => app.deleteHistory(h.id)} aria-label="削除">
                      削除
                    </button>
                  </div>
                );
              })}
          </div>
        );
      })}
    </>
  );
}
