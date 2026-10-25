"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppState";
import { GENRE_CLASS } from "@/components/DishView";
import { getDish } from "@/lib/dishes";
import { WEEKDAYS, addDays, formatDate, mondayOf, weekDates } from "@/lib/dates";
import { proteinPerServing } from "@/lib/nutrition";
import { dayProtein } from "@/lib/validator";
import type { Dish } from "@/lib/types";

const GENRES = ["和食", "中華", "洋食"] as const;
const METHODS = ["焼く", "煮る", "炒める", "蒸す", "揚げる", "生食・和える"] as const;

function CountBars({ title, items, keys, max }: { title: string; items: string[]; keys: readonly string[]; max: number }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <h3>{title}</h3>
      {keys.map((k) => {
        const n = items.filter((i) => i === k).length;
        return (
          <div key={k} className="row" style={{ marginBottom: 4 }}>
            <span className="small" style={{ width: 84 }}>{k}</span>
            <div className="bar grow">
              <span
                style={{
                  width: `${(n / 7) * 100}%`,
                  background: n > max ? "var(--error)" : GENRE_CLASS[k as keyof typeof GENRE_CLASS] ? `var(--${GENRE_CLASS[k as keyof typeof GENRE_CLASS]})` : undefined,
                }}
              />
            </div>
            <span className="small" style={{ width: 28, textAlign: "right" }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function WeekPage() {
  const app = useApp();
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  const weekStart = addDays(mondayOf(app.today), offset * 7);
  const plan = app.planFor(weekStart);
  const checks = app.checksFor(weekStart);
  const dates = weekDates(weekStart);

  const mains = (plan?.days ?? []).map((d) => getDish(d.mainId)).filter((d): d is Dish => !!d);

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      setError(app.generateWeek(weekStart));
      setBusy(false);
    }, 10);
  };

  return (
    <>
      <h1>1週間の献立</h1>
      <div className="tabs">
        {[-1, 0, 1].map((o) => (
          <button key={o} className={offset === o ? "active" : ""} onClick={() => setOffset(o)}>
            {o === -1 ? "先週" : o === 0 ? "今週" : "来週"}
          </button>
        ))}
      </div>
      <p className="muted">
        {formatDate(dates[0])} 〜 {formatDate(dates[6])}
      </p>

      <button className="btn block" disabled={busy || dates[6] < app.today} onClick={generate} style={{ marginBottom: 12 }}>
        {busy ? "作成中…" : plan ? "今日以降の献立を作り直す" : "この週の献立を作成"}
      </button>
      {error && <div className="notice error">{error}</div>}

      {dates.map((date, i) => {
        const day = plan?.days.find((d) => d.date === date);
        const main = day && getDish(day.mainId);
        const side = day && getDish(day.sideId);
        const soup = day && getDish(day.soupId);
        const records = app.history.filter((h) => h.date === date);
        return (
          <Link key={date} href={`/?date=${date}`} className="day-link">
            <div className="card day-row">
              <div className={`day-date ${date === app.today ? "today" : ""}`}>
                <div>{Number(date.slice(8))}</div>
                <div className="wd">{WEEKDAYS[i]}</div>
                {records.length > 0 && <div className="small">{records.every((r) => r.made) ? "✓" : "—"}</div>}
              </div>
              <div>
                {main ? (
                  <>
                    <div className="row wrap" style={{ gap: 4, marginBottom: 2 }}>
                      <span className={`badge ${GENRE_CLASS[main.genre]}`}>{main.genre}</span>
                      <span className="badge">{main.method}</span>
                      {main.isFish && <span className="badge accent">🐟 魚の日</span>}
                      {main.isPasta && <span className="badge accent">🍝 パスタの日</span>}
                      {main.isFried && <span className="badge warn">🍤 揚げ物の日</span>}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {main.name} <span className="muted small">{proteinPerServing(main)}g</span>
                    </div>
                    <div className="muted small">
                      {side?.name} ／ {soup?.name}
                    </div>
                    <div className="small">💪 合計 {dayProtein(day!)}g/人</div>
                    {day!.notes.length > 0 && <div className="small wn">⚠ {day!.notes[0]}</div>}
                  </>
                ) : records.length > 0 ? (
                  <div className="muted small">{records.map((r) => r.dishName).join("、")}</div>
                ) : (
                  <div className="muted small">献立なし</div>
                )}
              </div>
            </div>
          </Link>
        );
      })}

      {mains.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>ジャンル・調理方法のバランス（主菜）</h2>
          <CountBars title="ジャンル" items={mains.map((d) => d.genre)} keys={GENRES} max={3} />
          <CountBars title="調理方法" items={mains.map((d) => d.method)} keys={METHODS} max={3} />
        </div>
      )}

      {checks && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>品質チェック</h2>
          <p className="muted small">プログラムで自動検証した結果です（過去の履歴・前後の週の献立も含めて判定）。</p>
          {checks.map((c) => (
            <div key={c.id} className="check">
              <span className={`mark ${c.ok ? "ok" : c.severity === "error" ? "ng" : "wn"}`}>
                {c.ok ? "✓" : c.severity === "error" ? "✗" : "⚠"}
              </span>
              <div className="grow">
                <div>{c.label}</div>
                {c.details.map((d, i) => (
                  <div key={i} className="muted small">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
