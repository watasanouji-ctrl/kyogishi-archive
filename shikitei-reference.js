'use strict';
// Transcribed from four user screenshots (2026-11-02): Periods 42, 43, 44, 45.
// Tokens W / L mean the row player's win / loss; '-' is a bye. Each fixture is checked from both players.
// Period 45, Suzuki round 2: source screenshot incorrectly repeats opponent 鈴村 (self);
// corrected to 中井 from the reciprocal record 中井●–鈴村○. Confirm this with original records when possible.
// Player names match screenshot spellings; do NOT alias similar but different forenames without confirmation.
const SHIKITEI_HISTORIES=[
  {
    "term": 42,
    "champion": "貫地谷",
    "playoff": false,
    "rows": [
      {
        "key": "白石",
        "name": "白石恭弥",
        "seed": 1,
        "w": 4,
        "l": 4,
        "result": "降級",
        "fixture": "L鍵宮,W黛,L伊東,L井道,W兵条,W貫地谷,-,L佐野,W菅原"
      },
      {
        "key": "佐野",
        "name": "佐野貴史",
        "seed": 2,
        "w": 6,
        "l": 2,
        "result": "",
        "fixture": "W兵条,L貫地谷,W井道,W黛,-,W伊東,W菅原,W白石,L鍵宮"
      },
      {
        "key": "井道",
        "name": "井道光",
        "seed": 3,
        "w": 4,
        "l": 4,
        "result": "降級",
        "fixture": "L貫地谷,W兵条,L佐野,W白石,W菅原,-,W黛,L鍵宮,L伊東"
      },
      {
        "key": "鍵宮",
        "name": "鍵宮百瀬",
        "seed": 4,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "W白石,-,W菅原,L伊東,L貫地谷,L黛,W兵条,W井道,W佐野"
      },
      {
        "key": "貫地谷",
        "name": "貫地谷真人",
        "seed": 5,
        "w": 7,
        "l": 1,
        "result": "挑戦",
        "fixture": "W井道,W佐野,W兵条,W菅原,W鍵宮,L白石,W伊東,W黛,-"
      },
      {
        "key": "伊東",
        "name": "伊東衛泉",
        "seed": 5,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "-,L菅原,W白石,W鍵宮,W黛,L佐野,L貫地谷,W兵条,W井道"
      },
      {
        "key": "菅原",
        "name": "菅原理鳥",
        "seed": 5,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "W黛,W伊東,L鍵宮,L貫地谷,L井道,W兵条,L佐野,-,L白石"
      },
      {
        "key": "黛",
        "name": "黛脩也",
        "seed": 6,
        "w": 2,
        "l": 6,
        "result": "降級",
        "fixture": "L菅原,L白石,-,L佐野,L伊東,W鍵宮,L井道,L貫地谷,W兵条"
      },
      {
        "key": "兵条",
        "name": "兵条深希",
        "seed": 6,
        "w": 0,
        "l": 8,
        "result": "降級",
        "fixture": "L佐野,L井道,L貫地谷,-,L白石,L菅原,L鍵宮,L伊東,L黛"
      }
    ]
  },
  {
    "term": 43,
    "champion": "雨露院",
    "playoff": false,
    "rows": [
      {
        "key": "貫地谷",
        "name": "貫地谷真人",
        "seed": 1,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "L雨露院,W花村,L鈴村,L伊東,L佐野,L仁科,W鍵宮,W神島,-"
      },
      {
        "key": "佐野",
        "name": "佐野貴史",
        "seed": 2,
        "w": 6,
        "l": 2,
        "result": "",
        "fixture": "L伊東,W神島,-,W仁科,W貫地谷,W雨露院,W鈴村,W鍵宮,L花村"
      },
      {
        "key": "鍵宮",
        "name": "鍵宮百瀬",
        "seed": 3,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "W仁科,-,W伊東,W鈴村,W神島,W花村,L貫地谷,L佐野,L雨露院"
      },
      {
        "key": "伊東",
        "name": "伊東衛泉",
        "seed": 4,
        "w": 4,
        "l": 4,
        "result": "降級",
        "fixture": "W佐野,L仁科,L鍵宮,W貫地谷,-,W神島,W花村,L雨露院,L鈴村"
      },
      {
        "key": "雨露院",
        "name": "雨露院笹良",
        "seed": 5,
        "w": 7,
        "l": 1,
        "result": "挑戦",
        "fixture": "W貫地谷,W鈴村,W神島,-,W花村,L佐野,W仁科,W伊東,W鍵宮"
      },
      {
        "key": "鈴村",
        "name": "鈴村刀馬",
        "seed": 5,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "W神島,L雨露院,W貫地谷,L鍵宮,W仁科,-,L佐野,W花村,W伊東"
      },
      {
        "key": "仁科",
        "name": "仁科雅希",
        "seed": 5,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "L鍵宮,W伊東,L花村,L佐野,L鈴村,W貫地谷,L雨露院,-,W神島"
      },
      {
        "key": "花村",
        "name": "花村斎樹",
        "seed": 6,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "-,L貫地谷,W仁科,W神島,L雨露院,L鍵宮,L伊東,L鈴村,W佐野"
      },
      {
        "key": "神島",
        "name": "神島了",
        "seed": 6,
        "w": 0,
        "l": 8,
        "result": "降級",
        "fixture": "L鈴村,L佐野,L雨露院,L花村,L鍵宮,L伊東,-,L貫地谷,L仁科"
      }
    ]
  },
  {
    "term": 44,
    "champion": "鈴村",
    "playoff": true,
    "rows": [
      {
        "key": "行室",
        "name": "行室翔",
        "seed": 1,
        "w": 4,
        "l": 4,
        "result": "降級",
        "fixture": "W湊木,L佐野,W中原,W山村,L貫地谷,L乙葉,-,L鈴村,W鍵宮"
      },
      {
        "key": "佐野",
        "name": "佐野貴史",
        "seed": 2,
        "w": 6,
        "l": 2,
        "result": "",
        "fixture": "W中原,W行室,-,L鈴村,W山村,W貫地谷,W鍵宮,W湊木,L乙葉"
      },
      {
        "key": "鍵宮",
        "name": "鍵宮百瀬",
        "seed": 3,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "-,W山村,W乙葉,L貫地谷,L鈴村,L湊木,L佐野,W中原,L行室"
      },
      {
        "key": "鈴村",
        "name": "鈴村刀馬",
        "seed": 4,
        "w": 6,
        "l": 2,
        "result": "挑戦（PO勝利）",
        "fixture": "W乙葉,L貫地谷,W山村,W佐野,W鍵宮,-,L中原,W行室,W湊木"
      },
      {
        "key": "貫地谷",
        "name": "貫地谷真人",
        "seed": 5,
        "w": 6,
        "l": 2,
        "result": "",
        "fixture": "W山村,W鈴村,W湊木,W鍵宮,W行室,L佐野,L乙葉,-,W中原"
      },
      {
        "key": "乙葉",
        "name": "乙葉凛珊",
        "seed": 5,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "L鈴村,W中原,L鍵宮,-,L湊木,W行室,W貫地谷,W山村,W佐野"
      },
      {
        "key": "湊木",
        "name": "湊木伶士",
        "seed": 5,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "L行室,-,L貫地谷,L中原,W乙葉,W鍵宮,W山村,L佐野,L鈴村"
      },
      {
        "key": "中原",
        "name": "中原吉哉",
        "seed": 6,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "L佐野,L乙葉,L行室,W湊木,-,W山村,W鈴村,L鍵宮,L貫地谷"
      },
      {
        "key": "山村",
        "name": "山村尊十",
        "seed": 6,
        "w": 0,
        "l": 8,
        "result": "降級",
        "fixture": "L貫地谷,L鍵宮,L鈴村,L行室,L佐野,L中原,L湊木,L乙葉,-"
      }
    ]
  },
  {
    "term": 45,
    "champion": "貫地谷",
    "playoff": false,
    "rows": [
      {
        "key": "鈴村",
        "name": "鈴村刀馬",
        "seed": 1,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "-,W中井,L島崎,L貫地谷,W佐野,W宗方,L恩田,W乙葉,W行室"
      },
      {
        "key": "佐野",
        "name": "佐野貴史",
        "seed": 2,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "W恩田,W島崎,W中井,W宗方,L鈴村,-,W貫地谷,L行室,L乙葉"
      },
      {
        "key": "貫地谷",
        "name": "貫地谷真人",
        "seed": 3,
        "w": 7,
        "l": 1,
        "result": "挑戦",
        "fixture": "W中井,-,W行室,W鈴村,W宗方,W乙葉,L佐野,W恩田,W島崎"
      },
      {
        "key": "乙葉",
        "name": "乙葉凛珊",
        "seed": 4,
        "w": 4,
        "l": 4,
        "result": "降級",
        "fixture": "W行室,L宗方,L恩田,W中井,W島崎,L貫地谷,-,L鈴村,W佐野"
      },
      {
        "key": "行室",
        "name": "行室翔",
        "seed": 5,
        "w": 5,
        "l": 3,
        "result": "降級",
        "fixture": "L乙葉,W恩田,L貫地谷,W島崎,-,W中井,W宗方,W佐野,L鈴村"
      },
      {
        "key": "恩田",
        "name": "恩田碧志",
        "seed": 5,
        "w": 5,
        "l": 3,
        "result": "",
        "fixture": "L佐野,L行室,W乙葉,-,W中井,W島崎,W鈴村,L貫地谷,W宗方"
      },
      {
        "key": "宗方",
        "name": "宗方邦己",
        "seed": 5,
        "w": 1,
        "l": 7,
        "result": "降級",
        "fixture": "L島崎,W乙葉,-,L佐野,L貫地谷,L鈴村,L行室,L中井,L恩田"
      },
      {
        "key": "島崎",
        "name": "島崎才威",
        "seed": 6,
        "w": 3,
        "l": 5,
        "result": "降級",
        "fixture": "W宗方,L佐野,W鈴村,L行室,L乙葉,L恩田,W中井,-,L貫地谷"
      },
      {
        "key": "中井",
        "name": "中井紘斗",
        "seed": 6,
        "w": 1,
        "l": 7,
        "result": "降級",
        "fixture": "L貫地谷,L鈴村,L佐野,L乙葉,L恩田,L行室,L島崎,W宗方,-"
      }
    ]
  }
];
