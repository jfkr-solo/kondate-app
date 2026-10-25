"use client";

import { INGREDIENTS } from "@/lib/ingredients";
import { proteinPerServing, seasonalIngredientsOf } from "@/lib/nutrition";
import { proteinGroup } from "@/lib/rules";
import { formatAmount } from "@/lib/shopping";
import type { Dish, Genre } from "@/lib/types";

export const GENRE_CLASS: Record<Genre, string> = { 和食: "wa", 中華: "chu", 洋食: "yo" };

export function dishEmoji(d: Dish): string {
  if (d.category === "汁物") return d.genre === "和食" ? "🍲" : "🥣";
  if (d.category === "副菜") {
    if (d.mainIngredient === "卵") return "🍳";
    if (["納豆", "木綿豆腐", "絹ごし豆腐", "大豆水煮"].includes(d.mainIngredient)) return "🫘";
    return "🥗";
  }
  if (d.isPasta) return "🍝";
  if (d.isFried) return d.name.includes("天ぷら") ? "🍤" : "🍗";
  const g = proteinGroup(d);
  return { 魚: "🐟", 鶏: "🍗", 豚: "🥓", 牛: "🥩", 卵: "🍳", 大豆: "🫘", "エビ・イカ": "🦐" }[g] ?? "🍽️";
}

export function DishImage({ dish, size = 72 }: { dish: Dish; size?: number }) {
  return (
    <div
      className={`dish-image ${GENRE_CLASS[dish.genre]}`}
      style={{ width: size, height: size, fontSize: size * 0.52 }}
      role="img"
      aria-label={`${dish.name}のイメージ`}
    >
      {dishEmoji(dish)}
    </div>
  );
}

export function GenreBadge({ genre }: { genre: Genre }) {
  return <span className={`badge ${GENRE_CLASS[genre]}`}>{genre}</span>;
}

/** 画面A：料理の詳細カード */
export function DishCard({ dish, month, servings, pantry }: { dish: Dish; month: number; servings: number; pantry?: Set<string> }) {
  const seasonal = seasonalIngredientsOf(dish, month);
  const scale = servings / dish.servings;
  return (
    <section className="card">
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <DishImage dish={dish} />
        <div className="grow">
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="badge">{dish.category}</span>
            <GenreBadge genre={dish.genre} />
            {dish.isFish && <span className="badge accent">🐟 魚</span>}
            {dish.isPasta && <span className="badge accent">🍝 パスタ</span>}
            {dish.isFried && <span className="badge warn">揚げ物</span>}
          </div>
          <h3 style={{ margin: "4px 0" }}>{dish.name}</h3>
          <div className="meta">
            <span>🔥 {dish.method}</span>
            <span>⏱ {dish.time}分</span>
            <span>💪 タンパク質 {proteinPerServing(dish)}g/人</span>
          </div>
        </div>
      </div>

      {seasonal.length > 0 && (
        <div className="notice info" style={{ marginTop: 10, marginBottom: 0 }}>
          {seasonal.map((v) => (
            <div key={v.name}>
              <strong>旬：{v.name}</strong>
              {v.tip ? `　${v.tip}` : ""}
              {v.substitutes?.length ? (
                <span className="small">（代わりに：{v.substitutes.join("・")}）</span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 8 }}>
        <summary>材料（{servings}人分）と作り方</summary>
        <table className="ing">
          <tbody>
            {dish.ingredients.map((l) => {
              const isSeasoning = INGREDIENTS[l.name]?.kind === "調味料";
              return (
                <tr key={l.name}>
                  <td className={isSeasoning ? "muted" : ""}>
                    {l.name}
                    {pantry?.has(l.name) && <span className="badge accent" style={{ marginLeft: 6 }}>家にある</span>}
                  </td>
                  <td>{formatAmount(l.amount == null ? null : l.amount * scale, l.unit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ol>
          {dish.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {dish.equipment.length > 0 && <p className="muted">使う調理器具：{dish.equipment.join("・")}</p>}
      </details>
    </section>
  );
}
