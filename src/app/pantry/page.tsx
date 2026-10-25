"use client";

import { useState } from "react";
import { useApp } from "@/components/AppState";
import { DISHES } from "@/lib/dishes";
import { addDays, mondayOf, weekdayIndex } from "@/lib/dates";
import { PANTRY_PRESETS, ingredientsByKind, pantryCoverage } from "@/lib/pantry";

const GROUPS = ingredientsByKind();

export default function PantryPage() {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  const pantry = new Set(app.pantry);
  const toggle = (name: string) => {
    const next = new Set(pantry);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    app.setPantry([...next]);
  };
  const addAll = (items: string[]) => app.setPantry([...new Set([...app.pantry, ...items])]);

  // 食材リストだけで作れる主菜の数（調味料を除く食材がすべてそろう）
  const makeable = DISHES.filter((d) => d.category === "主菜" && pantryCoverage(d, pantry).missing.length === 0);
  const foodCount = app.pantry.filter((n) => !GROUPS.get("調味料")!.some((i) => i.name === n)).length;

  const regenerate = () => {
    setBusy(true);
    setTimeout(() => {
      const ws = mondayOf(app.today);
      const err = weekdayIndex(app.today) >= 5 ? app.generateWeek(ws, addDays(ws, 7)) : app.generateWeek(ws);
      setMessage(err ?? "食材リストを使って、今日以降の献立を作り直しました。");
      setBusy(false);
    }, 10);
  };

  return (
    <>
      <h1>食材リスト</h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          家にある食材をタップして登録してください。登録した食材で作れる料理を優先して提案し、買い物リストからは外します。
        </p>
        <p className="muted small">
          登録中：食材 {foodCount}品目・調味料 {app.pantry.length - foodCount}品目
          {makeable.length > 0 && `／リストの食材だけで作れる主菜 ${makeable.length}品`}
        </p>
        <div className="row wrap">
          {PANTRY_PRESETS.map((p) => (
            <button key={p.label} className="btn ghost small" onClick={() => addAll(p.items)}>
              ＋ {p.label}
            </button>
          ))}
          {app.pantry.length > 0 && (
            <button className="btn ghost small" onClick={() => app.setPantry([])}>
              すべて外す
            </button>
          )}
        </div>
        <button className="btn block" style={{ marginTop: 12 }} disabled={busy} onClick={regenerate}>
          {busy ? "作成中…" : "この食材で献立を作り直す"}
        </button>
        {message && <div className="notice info" style={{ marginTop: 10, marginBottom: 0 }}>{message}</div>}
      </div>

      {[...GROUPS.entries()].map(([kind, items]) =>
        items.length === 0 ? null : (
          <div key={kind} className="card">
            <h3 style={{ marginTop: 0 }}>{kind}</h3>
            <div className="chips">
              {items.map((i) => (
                <button
                  key={i.name}
                  type="button"
                  aria-pressed={pantry.has(i.name)}
                  className={`chip ${pantry.has(i.name) ? "on" : ""}`}
                  onClick={() => toggle(i.name)}
                >
                  {pantry.has(i.name) ? "✓ " : ""}
                  {i.name}
                </button>
              ))}
            </div>
          </div>
        ),
      )}
    </>
  );
}
