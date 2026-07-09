// 從 index.html 抽出配對與三碼資料，生成繁中研讀筆記 book-notes.html
import fs from "fs";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const PAIRS = new Function(html.match(/const PAIRS = \{[\s\S]*?\n\};/)[0] + "; return PAIRS;")();
const TRIPLES = new Function(html.match(/const TRIPLES = \[[\s\S]*?\n\];/)[0] + "; return TRIPLES;")();

const grade = s => s >= 8 ? "大吉" : s >= 5 ? "吉" : s >= 0 ? "平" : s >= -6 ? "凶" : "大凶";
const gcls = s => s >= 8 ? "gg" : s >= 5 ? "g" : s >= 0 ? "m" : s >= -6 ? "b" : "bb";
const rev = k => k[1] + k[0];
const pairLabel = k => k[0] === k[1] ? k : `${k} / ${rev(k)}`;

const entries = Object.entries(PAIRS).map(([k, v]) => ({ k, ...v }))
  .sort((a, b) => b.s - a.s || a.k.localeCompare(b.k));

const pairRows = entries.map(e => `
  <tr>
    <td class="pk">${pairLabel(e.k)}</td>
    <td class="pn">${e.name}${e.th ? `<span class="th">${e.th}</span>` : ""}</td>
    <td class="ps ${gcls(e.s)}">${grade(e.s)}<br><small>${e.s > 0 ? "+" : ""}${e.s}</small></td>
    <td class="pl">${e.pros.length ? e.pros.join("、") : "<span class='none'>無明顯優點</span>"}</td>
    <td class="pl">${e.cons.length ? e.cons.join("、") : "<span class='none'>無明顯缺點</span>"}</td>
  </tr>`).join("");

const tripleRows = TRIPLES.slice().sort((a, b) => a.p - b.p || a.set.localeCompare(b.set)).map(t => `
  <tr>
    <td class="pk">${t.label}<br><small>等不分順序</small></td>
    <td class="pn">${t.cat}</td>
    <td class="pl">${t.desc}</td>
    <td class="ps bb">${t.p}</td>
  </tr>`).join("");

// 塔克夏
const TK_CLOCK = [1, 2, 3, 4, 7, 5, 8, 6];
const TK_CATS = [
  { th: "บริวาร", zh: "眷屬", grp: "n", pt: 0 }, { th: "อายุ", zh: "健康", grp: "n", pt: 0 },
  { th: "เดช", zh: "權勢", grp: "g", pt: 1 }, { th: "ศรี", zh: "錢財", grp: "g", pt: 2 },
  { th: "มูละ", zh: "資產", grp: "g", pt: 1 }, { th: "อุตสาหะ", zh: "勤勉", grp: "n", pt: 0 },
  { th: "มนตรี", zh: "貴人", grp: "g", pt: 2 }, { th: "กาลี", zh: "凶星", grp: "b", pt: -3 }
];
const DAYS = { 1: "週日", 2: "週一", 3: "週二", 4: "週三（日）", 5: "週四", 6: "週五", 7: "週六", 8: "週三（夜）羅睺" };
const tkRows = [1, 2, 3, 4, 8, 5, 6, 7].map(day => {
  const start = TK_CLOCK.indexOf(day);
  const map = {};
  for (let k = 0; k < 8; k++) map[TK_CLOCK[(start + k) % 8]] = TK_CATS[k];
  const cells = [1, 2, 3, 4, 5, 6, 7, 8].map(d =>
    `<td class="tk-${map[d].grp}">${map[d].zh}</td>`).join("");
  return `<tr><th>${DAYS[day]}</th>${cells}</tr>`;
}).join("");

const out = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8">
<title>泰國手機號碼數字命理 研讀筆記</title>
<style>
  @page{ size:A4; margin:14mm 12mm; }
  *{ box-sizing:border-box; }
  body{ font-family:"PingFang TC","Heiti TC","Thonburi",sans-serif; color:#3d3628; margin:0; font-size:11px; line-height:1.65; }
  h1{ font-size:24px; margin:4px 0 2px; }
  h2{ font-size:16px; margin:22px 0 8px; padding:6px 10px; background:#f0e9d8; border-left:5px solid #8a7340; border-radius:4px; page-break-after:avoid; }
  h3{ font-size:13px; margin:14px 0 6px; color:#6b5a33; page-break-after:avoid; }
  .cover{ text-align:center; padding:40px 0 10px; }
  .cover .sub{ color:#7a6f57; font-size:13px; }
  .meta{ background:#faf6ec; border:1px solid #e5dcc6; border-radius:8px; padding:10px 14px; margin:14px 0; font-size:11px; }
  table{ border-collapse:collapse; width:100%; margin:6px 0 12px; }
  th,td{ border:1px solid #d8cfb8; padding:4px 6px; vertical-align:top; text-align:left; }
  th{ background:#f0e9d8; font-size:11px; }
  tr{ page-break-inside:avoid; }
  .pk{ font-weight:700; font-size:13px; white-space:nowrap; }
  .pk small{ font-weight:400; color:#9a917c; font-size:9px; }
  .pn{ font-weight:700; white-space:nowrap; }
  .pn .th{ display:block; font-weight:400; color:#9a917c; font-size:9px; }
  .ps{ text-align:center; font-weight:700; white-space:nowrap; width:44px; }
  .ps small{ font-weight:400; }
  .gg{ background:#dcebd2; color:#3f6b33; } .g{ background:#ebf2e4; color:#5b8f4e; }
  .m{ background:#f6f1e2; color:#8a7340; }
  .b{ background:#f6e3da; color:#a3562e; } .bb{ background:#f2d5cf; color:#96382a; }
  .pl{ font-size:10.5px; }
  .none{ color:#b0a88f; }
  .tk-g{ background:#dcebd2; } .tk-n{ background:#f6f1e2; } .tk-b{ background:#f2d5cf; font-weight:700; }
  .rule{ margin:0 0 8px 0; padding-left:18px; }
  .rule li{ margin-bottom:4px; }
  .imgbox{ text-align:center; margin:10px 0; }
  .imgbox img{ max-width:62%; border-radius:8px; border:1px solid #d8cfb8; }
  .cap{ font-size:10px; color:#7a6f57; }
  .pagebreak{ page-break-before:always; }
  .note{ background:#fdf3e0; border:1px solid #ecd9ae; border-radius:6px; padding:8px 12px; font-size:10.5px; margin:8px 0; }
</style></head><body>

<div class="cover">
  <div class="sub">泰國手機號碼數字命理・繁體中文重點整理</div>
  <h1>用數字力量改變人生</h1>
  <div class="sub">เปลี่ยนชีวิตด้วยพลังตัวเลข（SIM SO SUCCESS）</div>
  <div class="sub">原著：มนัส วิทูรประสาทผล｜Animate Group 出版｜附：ทักษา 塔克夏手稿圖解</div>
</div>

<div class="meta">
本筆記整理自原書 144 頁的核心內容與一張泰國傳統塔克夏（ทักษา）手稿。所有配對優缺點均直譯自書中逐頁內容；
「分數」欄是為了工具量化加上的，書中原文只做吉凶分類不給數字分數。線上工具：https://315112yjvs.github.io/sim-mongkol/
</div>

<h2>一、核心規則</h2>
<ol class="rule">
  <li><b>只看後 8 碼</b>：前 2 碼是電信商門號開頭（08、09、06），不列入吉凶計算。</li>
  <li><b>相鄰兩碼為一組「配對」（คู่ลำดับ）</b>：8 碼共有 7 組配對，這是全書分析的基本單位。</li>
  <li><b>配對雙向同義</b>：24 與 42 是同一組配對，吉凶相同。</li>
  <li><b>吉祥號（เบอร์มงคล）的定義</b>：後 8 碼完全不含任何仇敵配對（เลขคู่ศัตรู）。含仇敵配對的號碼即使其他配對再好，書中也不認定為吉祥號。</li>
  <li><b>三碼凶數不分順序</b>：書中明寫「สลับตัวเลขได้（可換位）」，例如 130、103、013 同組。</li>
  <li><b>數字 0 弊多於利</b>：0 是死亡之數，與任何數字相連多半減分，00 最凶。</li>
  <li><b>數字 9 隨鄰數變化</b>：9 本身偏吉（靈知、神佑），吉凶看它跟誰相鄰。</li>
  <li><b>換號十誡精選</b>：想換號的意願要出於自己（效果才快）；吉祥號不等於漂亮號；換號後專注於自己的目標，效果會更快更持續；號碼要配合每個人的需求排列，沒有人人通用的完美號。</li>
</ol>

<h2>二、十個數字的本質</h2>
<table>
  <tr><th style="width:36px">數字</th><th>泰文稱號</th><th>中文</th><th>特質摘要</th></tr>
  <tr><td class="pk">1</td><td>เจ้าแห่งเกียรติยศ</td><td class="pn">榮譽之主</td><td>領導、地位、自尊心強、受人敬重</td></tr>
  <tr><td class="pk">2</td><td>เจ้าแห่งความอ่อนโยน</td><td class="pn">溫柔之主</td><td>柔和、體貼、人緣、感受力強</td></tr>
  <tr><td class="pk">3</td><td>เจ้าแห่งนักรบ</td><td class="pn">戰士之主</td><td>衝勁、行動力、好勝、易衝動</td></tr>
  <tr><td class="pk">4</td><td>เจ้าแห่งการวางแผน</td><td class="pn">計劃之主</td><td>溝通、企劃、口才、思路靈活</td></tr>
  <tr><td class="pk">5</td><td>เจ้าแห่งปัญญา</td><td class="pn">智慧之主</td><td>學識、判斷、長輩緣、正向思考</td></tr>
  <tr><td class="pk">6</td><td>เจ้าแห่งศิลปะ</td><td class="pn">藝術之主</td><td>美感、品味、金錢流動、魅力</td></tr>
  <tr><td class="pk">7</td><td>เจ้าแห่งกสิกรรม</td><td class="pn">農耕之主</td><td>堅忍、耐勞、直言如斧、進度偏慢多阻</td></tr>
  <tr><td class="pk">8</td><td>เจ้าแห่งความมัวเมา</td><td class="pn">沉迷之主</td><td>熱情、投入、也易沉溺放縱</td></tr>
  <tr><td class="pk">9</td><td>เจ้าแห่งการหยั่งรู้</td><td class="pn">靈知之主</td><td>直覺、預感、神明庇佑、與命理有緣</td></tr>
  <tr><td class="pk">0</td><td>เจ้าแห่งความตาย</td><td class="pn">死亡之主</td><td>停滯、封閉、離群，書中列為最凶之數</td></tr>
</table>

<h2>三、配對分類總覽</h2>
<table>
  <tr><th>分類</th><th>成員</th><th>意義</th></tr>
  <tr><td class="pn">เลขคู่มิตร 吉配（摯友配）</td><td class="pk">15/51・24/42・36/63</td><td>智慧配、慈悲人緣配、錢財愛情配。促進金錢、事業、人脈、貴人，益處遠多於害處</td></tr>
  <tr><td class="pn">เลขคู่สมพล 助力配</td><td class="pk">16/61・28/82・35/53・47/74</td><td>排除障礙、加持財源、得人疼愛、工作發展</td></tr>
  <tr><td class="pn">เลขคู่ธาตุ 五行配</td><td class="pk">17/71・25/52・38/83</td><td>同元素數字相配，促進該元素的穩定圓滿（注意 25/52 同時被列入仇敵配，以仇敵論）</td></tr>
  <tr><td class="pn">เลขคู่ศัตรู 仇敵配（大凶）</td><td class="pk">13/31・18/81・25/52・27/72<br>37/73・48/84・67/76・68/86</td><td>造成金錢、工作、感情、家庭、健康各方面的阻礙，書中明言應避開；含這些配對即非吉祥號</td></tr>
</table>

<div class="pagebreak"></div>
<h2>四、55 組配對完整對照表（依吉凶排序）</h2>
<table>
  <tr><th style="width:70px">配對</th><th style="width:92px">名稱</th><th style="width:44px">評級</th><th>優點（ให้คุณ）</th><th>缺點（ให้โทษ）</th></tr>
  ${pairRows}
</table>

<div class="pagebreak"></div>
<h2>五、三碼凶數組合（不分順序，25 組）</h2>
<div class="note">三個數字連在一起出現時成立，順序可任意調換。多與 0 相關：仇敵配對再加上 0 會凶上加凶，書中稱「มหันตภัย 大禍」。</div>
<table>
  <tr><th style="width:110px">組合（書中寫法）</th><th style="width:100px">分類</th><th>影響</th><th style="width:36px">扣分</th></tr>
  ${tripleRows}
</table>

<div class="pagebreak"></div>
<h2>六、塔克夏（ทักษา）出生星期個人化</h2>
<p>塔克夏是泰國傳統占星的八宮盤，與書的配對系統互相獨立、可疊加使用。3×3 盤面順時針固定排列 1→2→3→4→7→5→8→6（中央為世界），
從你出生星期對應的數字起算「眷屬宮」，順時針輪轉八宮。同一個數字對不同星期出生的人吉凶完全不同。</p>
<div class="imgbox">
  <img src="S__47988740.jpg" alt="塔克夏手稿">
  <div class="cap">塔克夏手稿原圖：上方為主盤與八宮意義，下方八個小盤即各出生星期的結果（與下表一致）</div>
</div>

<h3>八宮意義與計分</h3>
<table>
  <tr><th>宮位</th><th>泰文</th><th>意義（手稿右欄）</th><th>工具計分</th></tr>
  <tr><td class="pn">錢財</td><td>ศรี</td><td>金錢、資財、吉祥</td><td class="ps gg">+2/碼</td></tr>
  <tr><td class="pn">貴人</td><td>มนตรี</td><td>名聲、提攜、受敬重</td><td class="ps gg">+2/碼</td></tr>
  <tr><td class="pn">權勢</td><td>เดช</td><td>權力、競爭力</td><td class="ps g">+1/碼</td></tr>
  <tr><td class="pn">資產</td><td>มูละ</td><td>財產、根基</td><td class="ps g">+1/碼</td></tr>
  <tr><td class="pn">眷屬</td><td>บริวาร</td><td>身邊的人、部屬</td><td class="ps m">0</td></tr>
  <tr><td class="pn">健康</td><td>อายุ</td><td>健康好壞</td><td class="ps m">0</td></tr>
  <tr><td class="pn">勤勉</td><td>อุตสาหะ</td><td>工作、努力</td><td class="ps m">0</td></tr>
  <tr><td class="pn">凶星</td><td>กาลี</td><td>凶惡之事</td><td class="ps bb">-3/碼</td></tr>
</table>

<h3>各出生星期的數字吉凶速查表</h3>
<table>
  <tr><th>出生星期</th><th>數字1</th><th>數字2</th><th>數字3</th><th>數字4</th><th>數字5</th><th>數字6</th><th>數字7</th><th>數字8</th></tr>
  ${tkRows}
</table>
<div class="note">
綠＝吉星（錢財、貴人、權勢、資產）、米＝中性（眷屬、健康、勤勉）、紅＝凶星（กาลี）。
9 與 0 在盤外：9 屬計都（เกตุ）偏吉，0 依書中本就列凶。週三出生分白天（06:00–18:00）與夜晚（18:00–06:00 屬羅睺）。
挑號時避開自己的凶星數字，多選錢財、貴人數字；號碼含 2 個以上凶星數字視為相沖。
</div>

<h2>七、實務選號建議</h2>
<ol class="rule">
  <li>先刪去含 <b>仇敵配對</b>（13、18、25、27、37、48、67、68 及其反轉）與 <b>三碼凶數</b> 的號碼。</li>
  <li>再看號碼是否含自己的塔克夏 <b>凶星數字</b>，2 個以上直接跳過。</li>
  <li>依需求挑配對：求財選 24/42、36/63、45/54、56/65；求事業選 15/51、35/53、63/36；求人緣感情選 24/42、46/64、56/65。</li>
  <li>0 越少越好；9 要看相鄰的數字。</li>
  <li>書中作者的做法：換了吉祥號之後停用舊號，並配合行善與自我改變，效果才完整。</li>
</ol>

</body></html>`;

fs.writeFileSync(new URL("./book-notes.html", import.meta.url), out);
console.log("book-notes.html generated,", entries.length, "pairs,", TRIPLES.length, "triples");
