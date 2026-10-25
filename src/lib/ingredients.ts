import type { IngredientInfo } from "./types";

// タンパク質(g/100g)は日本食品標準成分表(八訂)を参考にした概算値。
// 価格は首都圏スーパーの目安で、献立の予算チェックにのみ使う。

const AUTUMN_MUSHROOM = [9, 10, 11];

const LIST: IngredientInfo[] = [
  // ---- 肉 ----
  { name: "鶏むね肉", kind: "肉", unit: "g", proteinPer100g: 23.3, pricePerUnit: 0.8, allergens: ["鶏肉"] },
  { name: "鶏もも肉", kind: "肉", unit: "g", proteinPer100g: 16.6, pricePerUnit: 1.3, allergens: ["鶏肉"] },
  { name: "鶏ささみ", kind: "肉", unit: "本", gPerUnit: 50, proteinPer100g: 23.9, pricePerUnit: 55, allergens: ["鶏肉"] },
  { name: "鶏ひき肉", kind: "肉", unit: "g", proteinPer100g: 17.5, pricePerUnit: 1.0, allergens: ["鶏肉"] },
  { name: "鶏手羽元", kind: "肉", unit: "本", gPerUnit: 40, proteinPer100g: 18.2, pricePerUnit: 45, allergens: ["鶏肉"] },
  { name: "豚ロース肉", kind: "肉", unit: "g", proteinPer100g: 19.3, pricePerUnit: 2.0, allergens: ["豚肉"] },
  { name: "豚こま切れ肉", kind: "肉", unit: "g", proteinPer100g: 18.5, pricePerUnit: 1.6, allergens: ["豚肉"] },
  { name: "豚バラ肉", kind: "肉", unit: "g", proteinPer100g: 14.4, pricePerUnit: 2.0, allergens: ["豚肉"] },
  { name: "豚ひき肉", kind: "肉", unit: "g", proteinPer100g: 17.7, pricePerUnit: 1.4, allergens: ["豚肉"] },
  { name: "牛こま切れ肉", kind: "肉", unit: "g", proteinPer100g: 17.0, pricePerUnit: 2.8, allergens: ["牛肉"] },
  { name: "牛もも肉", kind: "肉", unit: "g", proteinPer100g: 19.5, pricePerUnit: 3.5, allergens: ["牛肉"] },
  { name: "合いびき肉", kind: "肉", unit: "g", proteinPer100g: 17.3, pricePerUnit: 1.5, allergens: ["牛肉", "豚肉"] },
  { name: "ベーコン", kind: "肉", unit: "g", proteinPer100g: 12.9, pricePerUnit: 2.5, allergens: ["豚肉"] },
  { name: "ハム", kind: "肉", unit: "枚", gPerUnit: 10, proteinPer100g: 16.5, pricePerUnit: 20, allergens: ["豚肉"] },

  // ---- 魚介 ----
  { name: "生鮭", kind: "魚介", unit: "切れ", gPerUnit: 100, proteinPer100g: 22.3, pricePerUnit: 150, season: [9, 10, 11], fish: true, allergens: ["さけ", "魚類"], substitutes: ["タラ"], tip: "秋鮭は脂が控えめで高タンパク" },
  { name: "サバ", kind: "魚介", unit: "切れ", gPerUnit: 100, proteinPer100g: 20.6, pricePerUnit: 130, season: [10, 11, 12, 1, 2], fish: true, allergens: ["さば", "魚類"], substitutes: ["ブリ"], tip: "秋〜冬のサバは脂がのりDHA・EPAが豊富" },
  { name: "ブリ", kind: "魚介", unit: "切れ", gPerUnit: 100, proteinPer100g: 21.4, pricePerUnit: 200, season: [12, 1, 2], fish: true, allergens: ["魚類"], substitutes: ["サバ"], tip: "冬の寒ブリは身が締まり旨みが強い" },
  { name: "タラ", kind: "魚介", unit: "切れ", gPerUnit: 100, proteinPer100g: 17.6, pricePerUnit: 150, season: [12, 1, 2], fish: true, allergens: ["魚類"], substitutes: ["生鮭"], tip: "冬が旬の低脂肪・高タンパクな白身魚" },
  { name: "カジキ", kind: "魚介", unit: "切れ", gPerUnit: 100, proteinPer100g: 19.2, pricePerUnit: 150, fish: true, allergens: ["魚類"], substitutes: ["ブリ"] },
  { name: "アジ", kind: "魚介", unit: "尾", gPerUnit: 85, proteinPer100g: 19.7, pricePerUnit: 120, season: [5, 6, 7, 8], fish: true, allergens: ["魚類"], substitutes: ["イワシ"], tip: "初夏〜夏のアジは脂がのって美味しい" },
  { name: "イワシ", kind: "魚介", unit: "尾", gPerUnit: 50, proteinPer100g: 19.2, pricePerUnit: 60, season: [6, 7, 8, 9, 10], fish: true, allergens: ["魚類"], substitutes: ["アジ"], tip: "カルシウムとDHAが豊富" },
  { name: "サンマ", kind: "魚介", unit: "尾", gPerUnit: 100, proteinPer100g: 18.1, pricePerUnit: 150, season: [9, 10, 11], strict: true, fish: true, allergens: ["魚類"], substitutes: ["イワシ"], tip: "秋の味覚。脂がのった旬は秋だけ" },
  { name: "むきエビ", kind: "魚介", unit: "g", proteinPer100g: 18.4, pricePerUnit: 3.0, allergens: ["えび"] },
  { name: "イカ", kind: "魚介", unit: "g", proteinPer100g: 17.9, pricePerUnit: 1.8, allergens: ["いか"] },
  { name: "ツナ缶", kind: "魚介", unit: "缶", gPerUnit: 70, proteinPer100g: 16.0, pricePerUnit: 120, allergens: ["魚類"] },
  { name: "しらす", kind: "魚介", unit: "g", proteinPer100g: 17.6, pricePerUnit: 4.0, allergens: ["魚類"] },
  { name: "ちくわ", kind: "魚介", unit: "本", gPerUnit: 30, proteinPer100g: 12.2, pricePerUnit: 25, allergens: ["魚類"] },

  // ---- 卵・大豆製品・乳製品 ----
  { name: "卵", kind: "卵", unit: "個", gPerUnit: 50, proteinPer100g: 12.2, pricePerUnit: 25, allergens: ["卵"] },
  { name: "木綿豆腐", kind: "大豆製品", unit: "丁", gPerUnit: 300, proteinPer100g: 7.0, pricePerUnit: 70, allergens: ["大豆"] },
  { name: "絹ごし豆腐", kind: "大豆製品", unit: "丁", gPerUnit: 300, proteinPer100g: 5.3, pricePerUnit: 70, allergens: ["大豆"] },
  { name: "厚揚げ", kind: "大豆製品", unit: "枚", gPerUnit: 150, proteinPer100g: 10.7, pricePerUnit: 100, allergens: ["大豆"] },
  { name: "油揚げ", kind: "大豆製品", unit: "枚", gPerUnit: 30, proteinPer100g: 23.4, pricePerUnit: 30, allergens: ["大豆"] },
  { name: "納豆", kind: "大豆製品", unit: "パック", gPerUnit: 45, proteinPer100g: 16.5, pricePerUnit: 30, allergens: ["大豆"] },
  { name: "大豆水煮", kind: "大豆製品", unit: "g", proteinPer100g: 12.9, pricePerUnit: 0.8, allergens: ["大豆"] },
  { name: "高野豆腐", kind: "大豆製品", unit: "枚", gPerUnit: 16, proteinPer100g: 50.5, pricePerUnit: 40, allergens: ["大豆"] },
  { name: "豆乳", kind: "大豆製品", unit: "ml", proteinPer100g: 3.6, pricePerUnit: 0.3, allergens: ["大豆"] },
  { name: "牛乳", kind: "乳製品", unit: "ml", proteinPer100g: 3.3, pricePerUnit: 0.25, allergens: ["乳"] },
  { name: "ピザ用チーズ", kind: "乳製品", unit: "g", proteinPer100g: 25.0, pricePerUnit: 2.0, allergens: ["乳"] },
  { name: "粉チーズ", kind: "乳製品", unit: "g", proteinPer100g: 44.0, pricePerUnit: 4.0, allergens: ["乳"] },

  // ---- 主食・その他 ----
  { name: "スパゲッティ", kind: "主食", unit: "g", proteinPer100g: 12.9, pricePerUnit: 0.4, allergens: ["小麦"] },
  { name: "ご飯", kind: "主食", unit: "g", proteinPer100g: 2.5, pricePerUnit: 0.5 },
  { name: "餃子の皮", kind: "主食", unit: "枚", gPerUnit: 6, proteinPer100g: 9.3, pricePerUnit: 6, allergens: ["小麦"] },
  { name: "春雨", kind: "その他", unit: "g", proteinPer100g: 0, pricePerUnit: 1.0 },
  { name: "こんにゃく", kind: "その他", unit: "枚", gPerUnit: 250, proteinPer100g: 0.1, pricePerUnit: 100 },
  { name: "トマト缶", kind: "その他", unit: "缶", gPerUnit: 400, proteinPer100g: 0.9, pricePerUnit: 100 },
  { name: "梅干し", kind: "その他", unit: "個", gPerUnit: 10, proteinPer100g: 0.7, pricePerUnit: 20 },
  { name: "白菜キムチ", kind: "その他", unit: "g", proteinPer100g: 2.3, pricePerUnit: 1.2 },

  // ---- 野菜 ----
  { name: "キャベツ", kind: "野菜", unit: "g", proteinPer100g: 1.3, pricePerUnit: 0.2, season: [1, 2, 3, 4, 5], substitutes: ["白菜"], tip: "春キャベツ・冬キャベツは甘みが強くビタミンCが豊富" },
  { name: "白菜", kind: "野菜", unit: "g", proteinPer100g: 0.8, pricePerUnit: 0.2, season: [11, 12, 1, 2], substitutes: ["キャベツ"], tip: "冬の白菜は甘みが増し、鍋や煮物で量を食べられる" },
  { name: "大根", kind: "野菜", unit: "g", proteinPer100g: 0.5, pricePerUnit: 0.15, season: [11, 12, 1, 2], substitutes: ["かぶ"], tip: "冬の大根は甘くて煮崩れしにくい" },
  { name: "かぶ", kind: "野菜", unit: "個", gPerUnit: 80, proteinPer100g: 0.7, pricePerUnit: 50, season: [3, 4, 5, 10, 11, 12], substitutes: ["大根"], tip: "春と秋が旬。やわらかく火の通りが早い" },
  { name: "にんじん", kind: "野菜", unit: "本", gPerUnit: 150, proteinPer100g: 0.7, pricePerUnit: 40, season: [9, 10, 11, 12], substitutes: ["かぼちゃ"], tip: "秋冬のにんじんは甘みとβ-カロテンが豊富" },
  { name: "玉ねぎ", kind: "野菜", unit: "個", gPerUnit: 200, proteinPer100g: 1.0, pricePerUnit: 40, season: [3, 4, 5, 6], substitutes: ["長ねぎ"], tip: "春の新玉ねぎは辛みが少なく生でも食べやすい" },
  { name: "じゃがいも", kind: "野菜", unit: "個", gPerUnit: 150, proteinPer100g: 1.8, pricePerUnit: 40, season: [5, 6, 9, 10], substitutes: ["里芋", "さつまいも"], tip: "新じゃが(初夏)と秋じゃがが旬。ビタミンCが加熱に強い" },
  { name: "さつまいも", kind: "野菜", unit: "g", proteinPer100g: 1.2, pricePerUnit: 0.5, season: [9, 10, 11, 12], substitutes: ["かぼちゃ"], tip: "秋が旬。食物繊維が豊富で甘みが強い" },
  { name: "かぼちゃ", kind: "野菜", unit: "g", proteinPer100g: 1.9, pricePerUnit: 0.4, season: [7, 8, 9, 10], substitutes: ["さつまいも"], tip: "夏〜秋が旬。β-カロテン・ビタミンEが豊富" },
  { name: "里芋", kind: "野菜", unit: "g", proteinPer100g: 1.5, pricePerUnit: 0.7, season: [9, 10, 11, 12], substitutes: ["じゃがいも"], tip: "秋が旬。ねっとりした食感でカリウムが豊富" },
  { name: "長いも", kind: "野菜", unit: "g", proteinPer100g: 2.2, pricePerUnit: 0.6, season: [11, 12, 1, 3, 4], substitutes: ["かぶ"], tip: "秋掘り・春掘りが旬。生で食べられ手軽" },
  { name: "れんこん", kind: "野菜", unit: "g", proteinPer100g: 1.9, pricePerUnit: 0.8, season: [10, 11, 12, 1, 2], substitutes: ["ごぼう"], tip: "秋冬が旬。ビタミンCと食物繊維が豊富" },
  { name: "ごぼう", kind: "野菜", unit: "g", proteinPer100g: 1.8, pricePerUnit: 0.6, season: [11, 12, 1], substitutes: ["れんこん"], tip: "冬が旬で香りが強く、食物繊維がとれる" },
  { name: "ほうれん草", kind: "野菜", unit: "g", proteinPer100g: 2.2, pricePerUnit: 0.8, season: [11, 12, 1, 2], substitutes: ["小松菜"], tip: "冬のほうれん草はビタミンCが夏の約3倍" },
  { name: "小松菜", kind: "野菜", unit: "g", proteinPer100g: 1.5, pricePerUnit: 0.6, season: [12, 1, 2], substitutes: ["ほうれん草", "チンゲン菜"], tip: "冬が旬。カルシウムが豊富でアク抜き不要" },
  { name: "チンゲン菜", kind: "野菜", unit: "株", gPerUnit: 100, proteinPer100g: 0.6, pricePerUnit: 50, season: [9, 10, 11], substitutes: ["小松菜"], tip: "秋が旬。炒めても色が鮮やかで食感が残る" },
  { name: "春菊", kind: "野菜", unit: "g", proteinPer100g: 2.3, pricePerUnit: 1.0, season: [11, 12, 1, 2], substitutes: ["ほうれん草"], tip: "冬が旬。香りがよくβ-カロテンが豊富" },
  { name: "水菜", kind: "野菜", unit: "g", proteinPer100g: 2.2, pricePerUnit: 0.6, season: [12, 1, 2], substitutes: ["小松菜"], tip: "冬が旬。シャキシャキで生でも食べられる" },
  { name: "長ねぎ", kind: "野菜", unit: "本", gPerUnit: 100, proteinPer100g: 1.4, pricePerUnit: 70, season: [11, 12, 1, 2], substitutes: ["玉ねぎ"], tip: "冬の長ねぎは甘みが増し、加熱でとろりとする" },
  { name: "青ねぎ", kind: "野菜", unit: "g", proteinPer100g: 1.9, pricePerUnit: 1.0 },
  { name: "ブロッコリー", kind: "野菜", unit: "g", proteinPer100g: 5.4, pricePerUnit: 0.8, season: [11, 12, 1, 2, 3], substitutes: ["さやいんげん"], tip: "冬が旬。野菜の中ではタンパク質が多くビタミンCも豊富" },
  { name: "ピーマン", kind: "野菜", unit: "個", gPerUnit: 35, proteinPer100g: 0.9, pricePerUnit: 30, season: [6, 7, 8, 9], substitutes: ["パプリカ"], tip: "夏が旬。ビタミンCが加熱で壊れにくい" },
  { name: "パプリカ", kind: "野菜", unit: "個", gPerUnit: 150, proteinPer100g: 1.0, pricePerUnit: 150, season: [6, 7, 8], substitutes: ["ピーマン"], tip: "夏が旬。甘みがありビタミンCが豊富" },
  { name: "なす", kind: "野菜", unit: "本", gPerUnit: 80, proteinPer100g: 1.1, pricePerUnit: 50, season: [6, 7, 8, 9], substitutes: ["ズッキーニ"], tip: "夏〜初秋が旬。油と相性がよい" },
  { name: "ズッキーニ", kind: "野菜", unit: "本", gPerUnit: 200, proteinPer100g: 1.3, pricePerUnit: 150, season: [6, 7, 8], substitutes: ["なす"], tip: "夏が旬。加熱しても形が崩れにくい" },
  { name: "トマト", kind: "野菜", unit: "個", gPerUnit: 150, proteinPer100g: 0.7, pricePerUnit: 80, season: [6, 7, 8], substitutes: ["ミニトマト"], tip: "夏が旬。リコピンが豊富" },
  { name: "ミニトマト", kind: "野菜", unit: "個", gPerUnit: 15, proteinPer100g: 1.1, pricePerUnit: 15, season: [6, 7, 8], substitutes: ["トマト"], tip: "夏が旬。甘みが強くお弁当にも" },
  { name: "きゅうり", kind: "野菜", unit: "本", gPerUnit: 100, proteinPer100g: 1.0, pricePerUnit: 50, season: [6, 7, 8], substitutes: ["大根"], tip: "夏が旬。水分が多く体を冷やす" },
  { name: "オクラ", kind: "野菜", unit: "本", gPerUnit: 10, proteinPer100g: 2.1, pricePerUnit: 15, season: [7, 8, 9], substitutes: ["さやいんげん"], tip: "夏が旬。ネバネバ成分が胃腸にやさしい" },
  { name: "ゴーヤ", kind: "野菜", unit: "本", gPerUnit: 250, proteinPer100g: 1.0, pricePerUnit: 200, season: [7, 8], strict: true, substitutes: ["ピーマン"], tip: "真夏が旬。ビタミンCが豊富で夏バテ対策に" },
  { name: "さやいんげん", kind: "野菜", unit: "g", proteinPer100g: 1.8, pricePerUnit: 1.0, season: [6, 7, 8, 9], substitutes: ["ブロッコリー"], tip: "夏が旬。β-カロテンと食物繊維がとれる" },
  { name: "枝豆", kind: "野菜", unit: "g", proteinPer100g: 11.7, pricePerUnit: 1.0, season: [7, 8], strict: true, substitutes: ["大豆水煮"], tip: "夏が旬。野菜なのにタンパク質が豊富" },
  { name: "そら豆", kind: "野菜", unit: "g", proteinPer100g: 10.9, pricePerUnit: 1.2, season: [5, 6], strict: true, substitutes: ["枝豆"], tip: "初夏だけの味。タンパク質が豊富" },
  { name: "アスパラガス", kind: "野菜", unit: "本", gPerUnit: 20, proteinPer100g: 2.6, pricePerUnit: 50, season: [4, 5, 6], strict: true, substitutes: ["さやいんげん"], tip: "春〜初夏が旬。アスパラギン酸で疲労回復" },
  { name: "菜の花", kind: "野菜", unit: "g", proteinPer100g: 4.4, pricePerUnit: 1.2, season: [2, 3], strict: true, substitutes: ["小松菜"], tip: "早春が旬。ほろ苦さとビタミンCが魅力" },
  { name: "絹さや", kind: "野菜", unit: "g", proteinPer100g: 3.1, pricePerUnit: 1.5, season: [4, 5], substitutes: ["さやいんげん"], tip: "春が旬。彩りがよく甘みがある" },
  { name: "レタス", kind: "野菜", unit: "g", proteinPer100g: 0.6, pricePerUnit: 0.5, season: [4, 5, 6, 7], substitutes: ["キャベツ"], tip: "春〜初夏が旬でみずみずしい" },
  { name: "セロリ", kind: "野菜", unit: "本", gPerUnit: 100, proteinPer100g: 0.4, pricePerUnit: 100, season: [12, 1, 2, 3, 4, 5], substitutes: ["玉ねぎ"] },
  { name: "もやし", kind: "野菜", unit: "袋", gPerUnit: 200, proteinPer100g: 1.7, pricePerUnit: 30 },
  { name: "しょうが", kind: "野菜", unit: "片", gPerUnit: 10, proteinPer100g: 0.9, pricePerUnit: 20 },
  { name: "にんにく", kind: "野菜", unit: "片", gPerUnit: 5, proteinPer100g: 6.4, pricePerUnit: 20 },
  { name: "大葉", kind: "野菜", unit: "枚", gPerUnit: 1, proteinPer100g: 3.9, pricePerUnit: 10, season: [6, 7, 8, 9] },
  { name: "切り干し大根", kind: "野菜", unit: "g", proteinPer100g: 9.7, pricePerUnit: 2.0 },

  // ---- きのこ ----
  { name: "しめじ", kind: "きのこ", unit: "パック", gPerUnit: 100, proteinPer100g: 2.7, pricePerUnit: 100, season: AUTUMN_MUSHROOM, substitutes: ["まいたけ", "えのきだけ"], tip: "秋が旬。旨みが強くビタミンDがとれる" },
  { name: "しいたけ", kind: "きのこ", unit: "枚", gPerUnit: 15, proteinPer100g: 3.1, pricePerUnit: 25, season: AUTUMN_MUSHROOM, substitutes: ["しめじ"], tip: "秋が旬。だしが出て料理の味が深まる" },
  { name: "えのきだけ", kind: "きのこ", unit: "袋", gPerUnit: 100, proteinPer100g: 2.7, pricePerUnit: 80, season: AUTUMN_MUSHROOM, substitutes: ["しめじ"], tip: "秋〜冬が旬。食物繊維が豊富で安価" },
  { name: "まいたけ", kind: "きのこ", unit: "パック", gPerUnit: 100, proteinPer100g: 2.0, pricePerUnit: 120, season: AUTUMN_MUSHROOM, substitutes: ["しめじ"], tip: "秋が旬。香りがよく、β-グルカンを含む" },
  { name: "エリンギ", kind: "きのこ", unit: "本", gPerUnit: 40, proteinPer100g: 2.8, pricePerUnit: 40, season: AUTUMN_MUSHROOM, substitutes: ["しいたけ"], tip: "秋が旬。歯ごたえがあり炒め物向き" },

  // ---- 海藻 ----
  { name: "乾燥わかめ", kind: "海藻", unit: "g", proteinPer100g: 13.6, pricePerUnit: 5 },
  { name: "芽ひじき", kind: "海藻", unit: "g", proteinPer100g: 9.2, pricePerUnit: 5 },
  { name: "もずく", kind: "海藻", unit: "g", proteinPer100g: 0.2, pricePerUnit: 1.0 },
  { name: "塩昆布", kind: "海藻", unit: "g", proteinPer100g: 16.9, pricePerUnit: 3 },

  // ---- 調味料（タンパク質は味噌以外は無視、価格は計算しない） ----
  ...[
    "醤油", "みりん", "酒", "砂糖", "塩", "こしょう", "塩こしょう", "酢", "黒酢", "ポン酢",
    "ごま油", "サラダ油", "オリーブオイル", "バター", "片栗粉", "小麦粉", "パン粉",
    "鶏ガラスープの素", "コンソメ", "だし汁", "水", "オイスターソース", "豆板醤", "甜麺醤",
    "ケチャップ", "ウスターソース", "マヨネーズ", "すりごま", "白いりごま", "かつお節",
    "レモン汁", "揚げ油", "粒マスタード", "カレー粉", "練りからし", "生クリーム", "はちみつ",
  ].map(
    (name): IngredientInfo => ({
      name,
      kind: "調味料",
      unit: "大さじ",
      proteinPer100g: 0,
      allergens:
        name === "醤油" ? ["大豆"]
        : name === "小麦粉" || name === "パン粉" ? ["小麦"]
        : name === "バター" || name === "生クリーム" ? ["乳"]
        : name === "マヨネーズ" ? ["卵"]
        : name === "ごま油" || name === "すりごま" || name === "白いりごま" ? ["ごま"]
        : name === "かつお節" ? ["魚類"]
        : name === "オイスターソース" ? ["魚類"]
        : undefined,
    }),
  ),
  // 味噌は量が多くタンパク質源になるので個別に定義（大さじ1 = 18g）
  { name: "味噌", kind: "調味料", unit: "大さじ", gPerUnit: 18, proteinPer100g: 12.5, allergens: ["大豆"] },
];

export const INGREDIENTS: Record<string, IngredientInfo> = Object.fromEntries(
  LIST.map((i) => [i.name, i]),
);

export function getIngredient(name: string): IngredientInfo | undefined {
  return INGREDIENTS[name];
}

/** その月が旬か */
export function isInSeason(info: IngredientInfo, month: number): boolean {
  return !!info.season?.includes(month);
}

/** 旬が限られる食材が、その月に手に入るか（旬の前後1か月まで） */
export function isAvailable(info: IngredientInfo, month: number): boolean {
  if (!info.strict || !info.season) return true;
  return info.season.some((m) => {
    const diff = Math.min(Math.abs(m - month), 12 - Math.abs(m - month));
    return diff <= 1;
  });
}

/** 指定月に旬を迎える野菜・きのこの一覧 */
export function seasonalVegetables(month: number): IngredientInfo[] {
  return LIST.filter(
    (i) => (i.kind === "野菜" || i.kind === "きのこ") && isInSeason(i, month),
  );
}
