// 計分引擎：與 https://315112yjvs.github.io/sim-mongkol/ 的網頁版同一套資料與邏輯
// PAIR_S：相鄰兩碼配對分數（未列的方向用反轉查）
// TRIPLE_P：三碼凶數組合扣分（不分順序，key 為排序後的三碼）
const PAIR_S = {"11":-1,"12":-3,"13":-8,"14":7,"15":9,"16":8,"17":0,"18":-8,"19":5,"22":6,"23":4,"24":10,"25":-7,"26":5,"27":-8,"28":3,"29":4,"33":-2,"34":-1,"35":4,"36":9,"37":-9,"38":-1,"39":3,"44":7,"45":10,"46":8,"47":2,"48":-7,"49":8,"55":9,"56":10,"57":0,"58":-3,"59":8,"66":6,"67":-9,"68":-7,"69":4,"77":-2,"78":0,"79":3,"88":-8,"89":2,"99":7,"00":-10,"01":-1,"02":-3,"03":-2,"04":3,"05":6,"06":2,"07":-6,"08":-4,"09":4};
const TRIPLE_P = {"001":-8,"002":-8,"003":-6,"004":-5,"005":-4,"006":-8,"007":-8,"008":-8,"013":-8,"018":-8,"037":-8,"027":-8,"067":-9,"068":-7,"048":-8,"058":-5,"034":-6,"112":-8,"123":-7,"023":-6,"235":-6,"077":-5,"148":-5,"045":-4,"555":-4};

// 塔克夏：3x3 盤順時針，八宮由出生星期數字起算
const TK_CLOCK = [1,2,3,4,7,5,8,6];
const TK_PTS = [0,0,1,2,1,0,2,-3]; // บริวาร,อายุ,เดช,ศรี,มูละ,อุตสาหะ,มนตรี,กาลี

function pairScore(a,b){
  const s = PAIR_S[a+b];
  return s !== undefined ? s : PAIR_S[b+a];
}

// 傳入純數字字串（10 碼 0 開頭手機號），回傳 {score, hasFatal} 或 null
function scoreNumber(digits, day){
  if(!/^0\d{9}$/.test(digits)) return null;
  const core = digits.slice(2); // 前兩碼不計，只看後 8 碼
  let sum = 0, hasFatal = false;
  for(let i=0;i<7;i++){
    const s = pairScore(core[i], core[i+1]);
    sum += s;
    if(s <= -7) hasFatal = true;
  }
  let score = Math.round((sum+70)/140*100);
  for(let i=0;i<6;i++){
    const key = core.slice(i,i+3).split("").sort().join("");
    if(TRIPLE_P[key] !== undefined) score += TRIPLE_P[key];
  }
  if(day){
    const start = TK_CLOCK.indexOf(Number(day));
    const pts = {};
    for(let k=0;k<8;k++) pts[TK_CLOCK[(start+k)%8]] = TK_PTS[k];
    let adj = 0;
    for(const c of core){
      const d = Number(c);
      if(d >= 1 && d <= 8) adj += pts[d];
    }
    score += Math.max(-12, Math.min(12, adj));
  }
  return { score: Math.max(0, Math.min(100, score)), hasFatal };
}

function scoreColor(score){
  if(score >= 85) return "#5b8f4e";
  if(score >= 70) return "#7da35a";
  if(score >= 55) return "#b08d2f";
  if(score >= 40) return "#c07a3a";
  return "#b5493a";
}
