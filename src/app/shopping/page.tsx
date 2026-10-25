"use client";

import { useState } from "react";
import { useApp } from "@/components/AppState";
import { addDays, formatDate, mondayOf } from "@/lib/dates";
import { buildShoppingList, formatAmount, riceToGo } from "@/lib/shopping";
import type { IngredientKind } from "@/lib/types";

export default function ShoppingPage() {
  const app = useApp();
  const [offset, setOffset] = useState(0);
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);
  const [showSeasonings, setShowSeasonings] = useState(false);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  const weekStart = addDays(mondayOf(app.today), offset * 7);
  const plan = app.planFor(weekStart);
  const days = (plan?.days ?? []).filter((d) => !onlyUpcoming || d.date >= app.today);
  const items = buildShoppingList(days, app.settings.servings);
  const groups = new Map<IngredientKind, typeof items>();
  for (const it of items) groups.set(it.kind, [...(groups.get(it.kind) ?? []), it]);

  const keyOf = (name: string) => `${weekStart}|${name}`;
  const remaining = items.filter((i) => i.kind !== "調味料" && !app.shoppingChecks[keyOf(i.name)]).length;

  return (
    <>
      <h1>買い物リスト</h1>
      <div className="tabs">
        {[0, 1].map((o) => (
          <button key={o} className={offset === o ? "active" : ""} onClick={() => setOffset(o)}>
            {o === 0 ? "今週" : "来週"}
          </button>
        ))}
      </div>
      <label className="row small" style={{ marginBottom: 10 }}>
        <input type="checkbox" checked={onlyUpcoming} onChange={(e) => setOnlyUpcoming(e.target.checked)} />
        今日以降の分だけ表示
      </label>

      {!plan || days.length === 0 ? (
        <p className="muted">この週の献立がありません。「1週間」の画面で献立を作成してください。</p>
      ) : (
        <>
          <p className="muted small">
            {formatDate(days[0].date)}〜{formatDate(days[days.length - 1].date)}・{app.settings.servings}人分・残り{remaining}品
          </p>
          {[...groups.entries()]
            .filter(([kind]) => kind !== "調味料")
            .map(([kind, list]) => (
              <div key={kind} className="card">
                <h3 style={{ marginTop: 0 }}>{kind}</h3>
                {list.map((it) => {
                  const done = !!app.shoppingChecks[keyOf(it.name)];
                  const rice = it.name === "ご飯";
                  return (
                    <label key={it.name} className={`shop-item ${done ? "done" : ""}`}>
                      <input type="checkbox" checked={done} onChange={() => app.toggleShopping(keyOf(it.name))} />
                      <div className="grow">
                        <div className="row spread">
                          <span className="name" style={{ fontWeight: 600 }}>
                            {rice ? "お米" : it.name}
                          </span>
                          <span>
                            {rice
                              ? `約${riceToGo(it.amounts[0].amount ?? 0)}合`
                              : it.amounts.map((a) => formatAmount(a.amount, a.unit)).join(" + ")}
                          </span>
                        </div>
                        {!rice && (
                          <div className="muted small">
                            {it.uses.map((u) => `${formatDate(u.date)} ${u.dish}`).join("、")}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          <div className="card">
            <button className="btn ghost small" onClick={() => setShowSeasonings(!showSeasonings)}>
              {showSeasonings ? "調味料を隠す" : "調味料も表示（家にあるか確認）"}
            </button>
            {showSeasonings &&
              (groups.get("調味料") ?? []).map((it) => (
                <div key={it.name} className="row spread small" style={{ padding: "4px 0", borderBottom: "1px dashed var(--line)" }}>
                  <span>{it.name}</span>
                  <span className="muted">{it.amounts.map((a) => formatAmount(a.amount, a.unit)).join(" + ")}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
