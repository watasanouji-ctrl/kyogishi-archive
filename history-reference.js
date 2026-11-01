// Historical league reference transcribed from two user-provided screenshots (2026-11-01).
// Periods 1–12: presence only; horizontal order has NO ranking significance.
// Periods 13–29: challenger (rank 1) followed by official places 2–11.
// Period 30: opening positions only; league ongoing and no final ranks.
// Champion is separate from ranked league participants; red bold = promoted entrants.
// Abbreviated surnames preserved verbatim where a full name was not supplied.
const HISTORICAL_S_CLASS=[
  {
    "term": 1,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "三田",
      "村上"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 2,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "工藤",
      "白井"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 3,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "三田",
      "依田"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 4,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "須永",
      "木村"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 5,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "原井",
      "三田"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 6,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "大倉",
      "遠藤",
      "岡野"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 7,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "斎藤",
      "遠藤",
      "小野",
      "篠宮"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 8,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "多田",
      "遠藤",
      "有馬",
      "篠宮",
      "千葉"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 9,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "多田",
      "大迫",
      "有馬",
      "園女",
      "千葉"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 10,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "安藤",
      "大迫",
      "有馬",
      "園女",
      "南"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 11,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "北上",
      "大迫",
      "有馬",
      "園女",
      "駒野",
      "新田"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 12,
    "names": [
      "水流川",
      "月原",
      "九条",
      "蔵田",
      "北上",
      "大迫",
      "有馬",
      "園女",
      "島海",
      "山田",
      "渡辺"
    ],
    "champion": "",
    "promoted": [],
    "type": "presence"
  },
  {
    "term": 13,
    "names": [
      "月原",
      "有馬",
      "佐野",
      "折原",
      "島海",
      "九条",
      "園女",
      "大迫",
      "北上",
      "蔵田"
    ],
    "champion": "水流川",
    "promoted": [
      "佐野",
      "折原"
    ],
    "type": "ranked"
  },
  {
    "term": 14,
    "names": [
      "佐野",
      "月原",
      "折原",
      "泉谷",
      "海部",
      "有馬",
      "九条",
      "大迫",
      "島海",
      "園女"
    ],
    "champion": "水流川",
    "promoted": [
      "泉谷",
      "海部"
    ],
    "type": "ranked"
  },
  {
    "term": 15,
    "names": [
      "泉谷",
      "佐野",
      "海部",
      "折原",
      "神田",
      "月原",
      "有馬",
      "猫塚",
      "九条",
      "大迫"
    ],
    "champion": "水流川",
    "promoted": [
      "神田",
      "猫塚"
    ],
    "type": "ranked"
  },
  {
    "term": 16,
    "names": [
      "神田",
      "佐野",
      "泉谷",
      "海部",
      "高橋",
      "折原",
      "月原",
      "有馬",
      "榎本",
      "猫塚"
    ],
    "champion": "水流川",
    "promoted": [
      "高橋",
      "榎本"
    ],
    "type": "ranked"
  },
  {
    "term": 17,
    "names": [
      "佐野",
      "泉谷",
      "葉山",
      "神田",
      "海部",
      "高橋",
      "有馬",
      "折原",
      "月原",
      "有瀬"
    ],
    "champion": "水流川",
    "promoted": [
      "葉山",
      "有瀬"
    ],
    "type": "ranked"
  },
  {
    "term": 18,
    "names": [
      "神田",
      "宇喜多",
      "泉谷",
      "海部",
      "高橋",
      "榎本",
      "折原",
      "葉山",
      "有馬",
      "稲葉"
    ],
    "champion": "佐野",
    "promoted": [
      "宇喜多",
      "榎本",
      "稲葉"
    ],
    "type": "ranked"
  },
  {
    "term": 19,
    "names": [
      "神田",
      "高橋",
      "新藤",
      "泉谷",
      "榎本",
      "海部",
      "国松",
      "葉山",
      "折原",
      "宇喜多"
    ],
    "champion": "佐野",
    "promoted": [
      "新藤",
      "国松"
    ],
    "type": "ranked"
  },
  {
    "term": 20,
    "names": [
      "佐野",
      "海部",
      "行室",
      "河村",
      "泉谷",
      "榎本",
      "高橋",
      "新藤",
      "葉山",
      "国松"
    ],
    "champion": "神田",
    "promoted": [
      "行室",
      "河村"
    ],
    "type": "ranked"
  },
  {
    "term": 21,
    "names": [
      "佐野",
      "行室",
      "泉谷",
      "榎本",
      "天童",
      "新藤",
      "一ノ瀬",
      "海部",
      "河村",
      "高橋"
    ],
    "champion": "神田",
    "promoted": [
      "天童",
      "一ノ瀬"
    ],
    "type": "ranked"
  },
  {
    "term": 22,
    "names": [
      "行室",
      "泉谷",
      "榎本",
      "一ノ瀬",
      "海部",
      "天童",
      "新藤",
      "葉山",
      "河村",
      "山崎",
      "春日"
    ],
    "champion": "佐野",
    "promoted": [
      "葉山",
      "山崎",
      "春日"
    ],
    "type": "ranked"
  },
  {
    "term": 23,
    "names": [
      "行室",
      "泉谷",
      "貫地谷",
      "一ノ瀬",
      "白石",
      "榎本",
      "葉山",
      "天童",
      "海部",
      "新藤"
    ],
    "champion": "佐野",
    "promoted": [
      "貫地谷",
      "白石"
    ],
    "type": "ranked"
  },
  {
    "term": 24,
    "names": [
      "貫地谷",
      "行室",
      "白石",
      "泉谷",
      "井道",
      "犬養",
      "一ノ瀬",
      "榎本",
      "葉山",
      "天童"
    ],
    "champion": "佐野",
    "promoted": [
      "井道",
      "犬養"
    ],
    "type": "ranked"
  },
  {
    "term": 25,
    "names": [
      "貫地谷",
      "行室",
      "白石",
      "一ノ瀬",
      "榎本",
      "井道",
      "中原",
      "泉谷",
      "新藤",
      "犬養",
      "王子"
    ],
    "champion": "佐野",
    "promoted": [
      "中原",
      "新藤",
      "王子"
    ],
    "type": "ranked"
  },
  {
    "term": 26,
    "names": [
      "行室",
      "貫地谷",
      "白石",
      "井道",
      "久我",
      "一ノ瀬",
      "中原",
      "仁科",
      "泉谷",
      "榎本",
      "平野"
    ],
    "champion": "佐野",
    "promoted": [
      "久我",
      "仁科",
      "平野"
    ],
    "type": "ranked"
  },
  {
    "term": 27,
    "names": [
      "貫地谷",
      "行室",
      "井道",
      "白石",
      "久我",
      "仁科",
      "鈴村",
      "真田",
      "花宮",
      "一ノ瀬",
      "中原"
    ],
    "champion": "佐野",
    "promoted": [
      "鈴村",
      "真田",
      "花宮"
    ],
    "type": "ranked"
  },
  {
    "term": 28,
    "names": [
      "佐野",
      "行室",
      "仁科",
      "鈴村",
      "伊東",
      "鍵宮",
      "井道",
      "白石",
      "久我",
      "榎本",
      "真田"
    ],
    "champion": "貫地谷",
    "promoted": [
      "伊東",
      "鍵宮",
      "榎本"
    ],
    "type": "ranked"
  },
  {
    "term": 29,
    "names": [
      "雨露院",
      "佐野",
      "鈴村",
      "行室",
      "仁科",
      "伊東",
      "鍵宮",
      "白石",
      "宗方",
      "志摩",
      "井道"
    ],
    "champion": "貫地谷",
    "promoted": [
      "雨露院",
      "宗方",
      "志摩"
    ],
    "type": "ranked"
  },
  {
    "term": 30,
    "names": [
      "雨露院",
      "佐野",
      "鈴村",
      "行室",
      "仁科",
      "伊東",
      "鍵宮",
      "白石",
      "乙葉",
      "菅原",
      "二条"
    ],
    "champion": "",
    "promoted": [
      "乙葉",
      "菅原",
      "二条"
    ],
    "type": "ongoing"
  }
];
const HISTORICAL_NAME_EXPANSIONS={
 "水流川":"水流川守","月原":"月原真司","佐野":"佐野貴史","折原":"折原佳臣","泉谷":"泉谷一樹","海部":"海部彩人",
 "神田":"神田良輔","榎本":"榎本春彦","新藤":"新藤栄太","行室":"行室翔","貫地谷":"貫地谷真人",
 "井道":"井道光","久我":"久我旭陽","仁科":"仁科雅希","鈴村":"鈴村刀馬","伊東":"伊東衛泉",
 "鍵宮":"鍵宮百瀬","白石":"白石恭弥","雨露院":"雨露院笹良","宗方":"宗方邦己",
 "志摩":"志摩華尋","乙葉":"乙葉莉胡","菅原":"菅原璃烏","二条":"二条巳尊",
 "真田":"真田伸一","花宮":"花宮","葉山":"葉山千尋","天童":"天童陸"
};
