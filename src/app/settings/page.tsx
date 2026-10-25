"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppState";
import { ALL_EQUIPMENT, ALLERGENS, type Settings } from "@/lib/types";

export default function SettingsPage() {
  const app = useApp();
  const [draft, setDraft] = useState<Settings>(app.settings);
  const [dislikeText, setDislikeText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (app.ready) {
      setDraft(app.settings);
      setDislikeText(app.settings.dislikes.join("、"));
    }
  }, [app.ready, app.settings]);

  if (!app.ready) return <p className="muted">読み込み中…</p>;

  const num = (key: keyof Settings, min: number, max: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(min, Math.min(max, Number(e.target.value) || min));
    setDraft({ ...draft, [key]: v });
    setSaved(false);
  };
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const save = () => {
    const dislikes = dislikeText
      .split(/[、,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    app.setSettings({ ...draft, dislikes });
    setSaved(true);
  };

  return (
    <>
      <h1>設定</h1>
      <div className="card">
        <label className="field">
          <span>1回あたりの人数</span>
          <input type="number" inputMode="numeric" min={1} max={10} value={draft.servings} onChange={num("servings", 1, 10)} />
        </label>
        <label className="field">
          <span>1食あたりの予算（{draft.servings}人分・円）</span>
          <input type="number" inputMode="numeric" step={100} min={300} max={10000} value={draft.budgetPerMeal} onChange={num("budgetPerMeal", 300, 10000)} />
        </label>
        <label className="field">
          <span>目標タンパク質（夕食1人あたり・g）</span>
          <input type="number" inputMode="numeric" min={10} max={100} value={draft.targetProtein} onChange={num("targetProtein", 10, 100)} />
        </label>
        <label className="field">
          <span>1品あたりの調理時間の上限（分）</span>
          <input type="number" inputMode="numeric" step={5} min={10} max={120} value={draft.maxCookTime} onChange={num("maxCookTime", 10, 120)} />
        </label>
      </div>

      <div className="card">
        <label className="field">
          <span>苦手な食材（「、」区切り）</span>
          <input type="text" value={dislikeText} placeholder="例：ゴーヤ、セロリ" onChange={(e) => { setDislikeText(e.target.value); setSaved(false); }} />
        </label>
        <div className="field">
          <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 6 }}>アレルギー食材</span>
          <div className="chips">
            {ALLERGENS.map((a) => (
              <label key={a} className={`chip ${draft.allergies.includes(a) ? "on" : ""}`}>
                <input type="checkbox" checked={draft.allergies.includes(a)} onChange={() => { setDraft({ ...draft, allergies: toggle(draft.allergies, a) }); setSaved(false); }} />
                {a}
              </label>
            ))}
          </div>
          <p className="muted small">「魚類」には魚・かつお節・オイスターソースなどが含まれます。</p>
        </div>
        <div className="field">
          <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: 6 }}>利用できる調理器具（コンロ・フライパン・鍋は前提）</span>
          <div className="chips">
            {ALL_EQUIPMENT.map((e) => (
              <label key={e} className={`chip ${draft.equipment.includes(e) ? "on" : ""}`}>
                <input type="checkbox" checked={draft.equipment.includes(e)} onChange={() => { setDraft({ ...draft, equipment: toggle(draft.equipment, e) }); setSaved(false); }} />
                {e}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button className="btn block" onClick={save}>
        保存する
      </button>
      {saved && <div className="notice info" style={{ marginTop: 10 }}>保存しました。次に献立を作成・作り直すときに反映されます。</div>}
      <p className="muted small" style={{ marginTop: 16 }}>
        データ（設定・献立・履歴・買い物チェック）はこの端末のブラウザに保存されます。
      </p>
    </>
  );
}
