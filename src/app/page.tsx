"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useApp } from "@/components/AppState";
import { DishCard } from "@/components/DishView";
import { ServingsPicker } from "@/components/ServingsPicker";
import { getDish } from "@/lib/dishes";
import { addDays, formatDate, mondayOf, monthOf, weekdayIndex } from "@/lib/dates";
import { riceProteinPerServing, seasonalIngredientsOf } from "@/lib/nutrition";
import { dayCost, dayProtein } from "@/lib/validator";

function TodayInner() {
  const app = useApp();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  const date = params.get("date") ?? app.today;
  const isToday = date === app.today;
  const plan = app.planFor(mondayOf(date));
  const day = plan?.days.find((d) => d.date === date);
  const records = app.history.filter((h) => h.date === date);
  const made = records.length > 0 ? records.every((h) => h.made) : null;

  const run = (f: () => string | null) => {
    setBusy(true);
    // 生成処理の前に「作成中」を描画させる
    setTimeout(() => {
      setError(f());
      setBusy(false);
    }, 10);
  };

  if (!day) {
    return (
      <>
        <h1>{isToday ? "今日の献立" : `${formatDate(date)}の献立`}</h1>
        <div className="card">
          <p>まだ献立がありません。1週間分の献立をまとめて作成します。</p>
          <button className="btn block" disabled={busy || date < app.today} onClick={() =>
              run(() =>
                // 週末なら来週の分もまとめて作る
                weekdayIndex(date) >= 5
                  ? app.generateWeek(mondayOf(date), addDays(mondayOf(date), 7))
                  : app.generateWeek(mondayOf(date)),
              )
            }
          >
            {busy ? "作成中…" : weekdayIndex(date) >= 5 ? "今週末と来週の献立を作成" : "この週の献立を作成"}
          </button>
          {date < app.today && <p className="muted">過ぎた日の献立は作成できません。</p>}
        </div>
        {error && <div className="notice error">{error}</div>}
      </>
    );
  }

  const main = getDish(day.mainId);
  const side = getDish(day.sideId);
  const soup = getDish(day.soupId);
  const dishes = [main, side, soup].filter((d) => !!d);
  const month = monthOf(date);
  const protein = dayProtein(day);
  const cost = dayCost(day, app.settings.servings);
  const seasonalNames = [...new Set(dishes.flatMap((d) => seasonalIngredientsOf(d!, month).map((i) => i.name)))];
  const pct = Math.min(100, Math.round((protein / app.settings.targetProtein) * 100));

  return (
    <>
      <div className="row spread">
        <h1>{isToday ? "今日の献立" : "献立"}</h1>
        <span className="muted">{formatDate(date)}</span>
      </div>

      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <ServingsPicker value={app.settings.servings} onChange={(n) => app.setSettings({ ...app.settings, servings: n })} />
        </div>
        <div className="summary">
          <div>
            <div className="num">{protein}g</div>
            <div className="label">タンパク質/人</div>
          </div>
          <div>
            <div className="num">{Math.max(...dishes.map((d) => d!.time))}分〜</div>
            <div className="label">調理時間の目安</div>
          </div>
          <div>
            <div className="num">約{cost}円</div>
            <div className="label">{app.settings.servings}人分の材料費</div>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          目標 {app.settings.targetProtein}g/人 に対して {pct}%
          {!main?.isPasta && `（ご飯150g ${riceProteinPerServing()}g を含む）`}
          {seasonalNames.length > 0 && ` ・ 旬：${seasonalNames.join("、")}`}
        </p>
      </div>

      {day.notes.map((n, i) => (
        <div key={i} className="notice warn">
          {n}
        </div>
      ))}

      {main && <DishCard dish={main} month={month} servings={app.settings.servings} />}
      {side && <DishCard dish={side} month={month} servings={app.settings.servings} />}
      {soup && <DishCard dish={soup} month={month} servings={app.settings.servings} />}
      {main && !main.isPasta && <p className="muted small">主食：ご飯（1人150g）</p>}

      <div className="card">
        <div className="row wrap">
          <button className={`btn ${made === true ? "" : "secondary"}`} onClick={() => app.recordDay(date, true)} disabled={date > app.today}>
            {made === true ? "✓ 作った" : "作った"}
          </button>
          <button className={`btn ${made === false ? "" : "ghost"}`} onClick={() => app.recordDay(date, false)} disabled={date > app.today}>
            {made === false ? "✓ 作らなかった" : "作らなかった"}
          </button>
          <button className="btn ghost" disabled={busy || made !== null} onClick={() => run(() => app.regenerateDay(date))}>
            {busy ? "作成中…" : "この日を作り直す"}
          </button>
        </div>
        <p className="muted small" style={{ margin: "8px 0 0" }}>
          記録は献立履歴に保存され、14日間の重複判定に使われます。記録しなかった日は翌日以降に「作った」として自動記録されます。
        </p>
      </div>
      {error && <div className="notice error">{error}</div>}
      <p className="small">
        <Link href="/week">1週間の献立を見る →</Link>
      </p>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中…</p>}>
      <TodayInner />
    </Suspense>
  );
}
