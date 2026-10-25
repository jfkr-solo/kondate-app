import { describe, expect, it } from "vitest";
import { isSameDishName, normalizeDishName } from "@/lib/normalize";

describe("料理名の正規化", () => {
  it("表記揺れを同じ料理として扱う", () => {
    expect(normalizeDishName("鶏の照り焼き")).toBe(normalizeDishName("鶏肉の照焼き"));
    expect(normalizeDishName("チキンの照りやき")).toBe(normalizeDishName("鶏の照り焼き"));
    expect(normalizeDishName("豚肉のしょうが焼き")).toBe(normalizeDishName("豚の生姜焼き"));
    expect(normalizeDishName("鶏のから揚げ")).toBe(normalizeDishName("鶏の唐揚げ"));
    expect(normalizeDishName("さばの味噌煮")).toBe(normalizeDishName("サバのみそ煮"));
    expect(normalizeDishName("ｻﾊﾞの味噌煮")).toBe(normalizeDishName("サバの味噌煮"));
  });

  it("異なる料理は区別する", () => {
    expect(isSameDishName("鮭の塩焼き", "アジの塩焼き")).toBe(false);
    expect(isSameDishName("鶏の照り焼き", "カジキの照り焼き")).toBe(false);
    expect(isSameDishName("豆腐とわかめの味噌汁", "大根と油揚げの味噌汁")).toBe(false);
  });

  it("ごく近い表記は類似料理と判定する", () => {
    expect(isSameDishName("鶏むね肉のトマト煮", "鶏むね肉のトマト煮込み")).toBe(true);
  });
});
