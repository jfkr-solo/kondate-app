// 料理名の表記揺れを吸収するための正規化
// 例：「鶏の照り焼き」「鶏肉の照焼き」「チキンの照りやき」→「鶏照焼」

const SYNONYMS: [RegExp, string][] = [
  [/鶏肉|とり肉|鳥肉|とりにく|チキン|鳥/g, "鶏"],
  [/豚肉|ぶた肉|ぶたにく|ポーク/g, "豚"],
  [/牛肉|ぎゅう肉|ビーフ/g, "牛"],
  [/照り焼き|照焼き|照りやき|てりやき|テリヤキ|照焼/g, "照焼"],
  [/唐揚げ|から揚げ|からあげ|カラアゲ|唐揚/g, "唐揚"],
  [/生姜焼き|しょうが焼き|ショウガ焼き|生姜焼/g, "生姜焼"],
  [/しょうが|ショウガ|生姜/g, "生姜"],
  [/味噌|みそ|ミソ/g, "味噌"],
  [/鮭|さけ|しゃけ|サケ|シャケ|サーモン/g, "鮭"],
  [/鯖|さば|サバ/g, "鯖"],
  [/鯵|あじ|アジ/g, "鯵"],
  [/鰤|ぶり|ブリ/g, "鰤"],
  [/鱈|たら|タラ/g, "鱈"],
  [/鰯|いわし|イワシ/g, "鰯"],
  [/秋刀魚|さんま|サンマ/g, "秋刀魚"],
  [/海老|えび|エビ/g, "海老"],
  [/玉子|たまご|タマゴ/g, "卵"],
  [/とうふ|トウフ/g, "豆腐"],
  [/なす|ナス|茄子/g, "茄子"],
  [/スパゲッティ|スパゲティ|スパゲティー|パスタ/g, "パスタ"],
  [/ハンバーグステーキ/g, "ハンバーグ"],
  [/お味噌汁|御味噌汁/g, "味噌汁"],
];

// 送り仮名などのゆれ
const OKURIGANA: [RegExp, string][] = [
  [/焼き/g, "焼"],
  [/揚げ/g, "揚"],
  [/炒め/g, "炒"],
  [/煮付け|煮つけ|煮込み|煮込/g, "煮"],
  [/和え/g, "和"],
  [/蒸し/g, "蒸"],
];

export function normalizeDishName(name: string): string {
  let s = name.normalize("NFKC").trim().toLowerCase();
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep);
  for (const [re, rep] of OKURIGANA) s = s.replace(re, rep);
  // 助詞・記号・空白・「風」を除去
  s = s.replace(/[\s・、。,.!！?？「」『』()（）\-ー〜~]/g, "");
  s = s.replace(/の|風/g, "");
  return s;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/** 正規化後の文字列の類似度（0〜1） */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeDishName(a);
  const nb = normalizeDishName(b);
  if (na === nb) return 1;
  const len = Math.max(na.length, nb.length);
  if (len === 0) return 1;
  return 1 - levenshtein(na, nb) / len;
}

/** 表記揺れ・ごく近い名前を同じ料理とみなすか */
export function isSameDishName(a: string, b: string): boolean {
  return nameSimilarity(a, b) >= 0.85;
}
