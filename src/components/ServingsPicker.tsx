"use client";

import { SERVING_OPTIONS } from "@/lib/types";

/** 何人分かを選ぶボタン（1〜4人分） */
export function ServingsPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="tabs" role="radiogroup" aria-label="人数" style={{ marginBottom: 0 }}>
      {SERVING_OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value === n ? "active" : ""}
          onClick={() => onChange(n)}
        >
          {n}人分
        </button>
      ))}
    </div>
  );
}
