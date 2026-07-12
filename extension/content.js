// 掃描頁面文字中的手機號碼（泰國 06/08/09、台灣 09 開頭，共 10 碼），在旁邊插入分數標籤
// 分組不拘：092-867-5576 / 0980-288838 / 0968-888-555 / 0980-79-79-79 / 0900 007 123 / +66 92-867-5576
const BMK_RE = /\+?\d(?:[-\s]?\d){8,10}/g;
const TOOL_URL = "https://315112yjvs.github.io/sim-mongkol/";

let bmkDay = "";
let bmkAuto = true;
let bmkObserver = null;
let bmkTimer = null;

function bmkNormalize(text){
  let d = text.replace(/\D/g, "");
  if(d.length === 11 && d.startsWith("66")) d = "0" + d.slice(2);
  return /^0[689]\d{8}$/.test(d) ? d : null;
}

function bmkMakeBadge(digits){
  const info = scoreNumber(digits, bmkDay);
  if(!info) return null;
  const a = document.createElement("a");
  a.className = "bmk-badge";
  a.textContent = info.score + (info.hasFatal ? "!" : "");
  a.style.background = scoreColor(info.score);
  a.title = "เบอร์มงคล 分數 " + info.score + (info.hasFatal ? "（含書中大凶配對）" : "") + "，點擊看完整分析";
  a.href = TOOL_URL + "?n=" + digits + (bmkDay ? "&d=" + bmkDay : "");
  a.target = "_blank";
  a.rel = "noopener";
  a.addEventListener("click", e => e.stopPropagation());
  return a;
}

function bmkScan(root){
  const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      const p = node.parentElement;
      if(!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if(tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA") return NodeFilter.FILTER_REJECT;
      if(p.closest(".bmk-badge")) return NodeFilter.FILTER_REJECT;
      if(p.dataset.bmkDone){
        // SPA 翻頁會重用 DOM 元素只換文字：若徽章已不在，代表內容換了，清掉標記重掃
        if(p.querySelector(".bmk-badge")) return NodeFilter.FILTER_REJECT;
        delete p.dataset.bmkDone;
      }
      return BMK_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  const targets = [];
  while(walker.nextNode()) targets.push(walker.currentNode);

  for(const node of targets){
    const text = node.nodeValue;
    BMK_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, matched = false, m;
    while((m = BMK_RE.exec(text))){
      // 前後不能緊貼其他數字，避免撈到訂單編號等長數字串
      const before = text[m.index - 1], after = text[m.index + m[0].length];
      if((before && /\d/.test(before)) || (after && /\d/.test(after))) continue;
      const digits = bmkNormalize(m[0]);
      if(!digits) continue;
      const badge = bmkMakeBadge(digits);
      if(!badge) continue;
      matched = true;
      frag.appendChild(document.createTextNode(text.slice(last, m.index + m[0].length)));
      frag.appendChild(badge);
      last = m.index + m[0].length;
    }
    if(!matched) continue;
    frag.appendChild(document.createTextNode(text.slice(last)));
    if(node.parentElement) node.parentElement.dataset.bmkDone = "1";
    node.parentNode.replaceChild(frag, node);
  }
}

function bmkClear(){
  document.querySelectorAll(".bmk-badge").forEach(b => b.remove());
  document.querySelectorAll("[data-bmk-done]").forEach(el => delete el.dataset.bmkDone);
}

function bmkStartObserver(){
  if(bmkObserver) return;
  bmkObserver = new MutationObserver(() => {
    clearTimeout(bmkTimer);
    bmkTimer = setTimeout(() => bmkScan(), 500);
  });
  bmkObserver.observe(document.body, { childList: true, subtree: true });
}

function bmkStopObserver(){
  if(bmkObserver){ bmkObserver.disconnect(); bmkObserver = null; }
}

chrome.storage.sync.get({ auto: true, day: "" }, cfg => {
  bmkAuto = cfg.auto;
  bmkDay = cfg.day;
  if(bmkAuto){ bmkScan(); bmkStartObserver(); }
});

// ---------- 自動獵號：自動翻頁，掃到達標分數就通知並停下 ----------
let hunt = null; // {threshold, timer, sameCount, lastSig}

function bmkFindNext(){
  const clickable = el => {
    if(!el) return null;
    const c = el.closest("a,button,[role='button'],li");
    const t = c || el;
    if(t.disabled || t.getAttribute("aria-disabled") === "true" || t.classList.contains("disabled")) return null;
    return t;
  };
  // 元素附近（往上 6 層）是否有一排數字頁碼：用來排除輪播箭頭等假貨
  const inPagination = el => {
    let cur = el;
    for(let i = 0; i < 6 && cur && cur !== document.body; i++){
      let count = 0;
      for(const c of cur.querySelectorAll("a,button,li,span")){
        if(/^\d{1,4}$/.test(c.textContent.trim()) && ++count >= 3) return true;
      }
      cur = cur.parentElement;
    }
    return false;
  };
  const cands = [];
  const add = (el, score) => { if(el && el.offsetParent) cands.push({ el, score }); };
  const isCarousel = (hay, cls) => /slick|swiper|carousel|slider|gallery|banner/.test(hay + " " + cls);

  // 1. rel=next
  add(document.querySelector("a[rel='next']"), 20);

  // 2. aria-label / data-testid / test-id / title / class 含 next（排除 prev 與輪播）
  for(const cand of document.querySelectorAll("[aria-label],[data-testid],[test-id],[title],[class*='next' i]")){
    const hay = [
      cand.getAttribute("aria-label"), cand.getAttribute("data-testid"),
      cand.getAttribute("test-id"), cand.getAttribute("title")
    ].filter(Boolean).join(" ").toLowerCase();
    const cls = (cand.className + "").toLowerCase();
    if(hay.includes("prev") || hay.includes("back") || /(^|[-_ ])prev/.test(cls)) continue;
    if(isCarousel(hay, cls)) continue;
    const attrHit = hay.includes("next") || hay.includes("下一");
    const clsHit = /(^|[-_ ])next([-_ ]|$)/.test(cls);
    if(attrHit || clsHit){
      add(clickable(cand), (attrHit ? 6 : 3) + (hay.includes("page") || hay.includes("頁") ? 3 : 0));
    }
  }
  // 3. 箭頭符號
  const arrows = new Set([">", "›", "»", "❯", "→", "ถัดไป", "下一頁", "下頁"]);
  for(const cand of document.querySelectorAll("a,button,[role='button'],span,li")){
    if(cand.children.length > 1) continue;
    if(arrows.has(cand.textContent.trim())) add(clickable(cand), 2);
  }
  // 4. 頁碼：目前頁 +1
  const curEl = document.querySelector("[aria-current]:not([aria-current='false']),[class*='active'],[class*='current'],[class*='selected']");
  if(curEl){
    const n = parseInt(curEl.textContent.trim());
    if(!isNaN(n)){
      for(const cand of document.querySelectorAll("a,button,[role='button'],li,span")){
        if(cand.textContent.trim() === String(n + 1)) add(clickable(cand), 1);
      }
    }
  }
  // 附近有數字頁碼列的大幅加分，取最高分
  let best = null;
  const seen = new Set();
  for(const c of cands){
    if(seen.has(c.el)) continue;
    seen.add(c.el);
    c.score += inPagination(c.el) ? 10 : 0;
    if(!best || c.score > best.score) best = c;
  }
  // 低可信度候選（純箭頭符號、class 猜測、頁碼推測）必須有分頁情境才點，避免誤點輪播等元件
  if(best && best.score < 6) return null;
  return best ? best.el : null;
}

function bmkPageSig(){
  return [...document.querySelectorAll(".bmk-badge")].slice(0, 5).map(b => b.href).join("|");
}

// ---------- 頁面內回饋 UI（不依賴系統通知權限） ----------
function bmkBanner(text, type = "info", ttl = 8000){
  let el = document.getElementById("bmk-banner");
  if(!el){
    el = document.createElement("div");
    el.id = "bmk-banner";
    document.documentElement.appendChild(el);
  }
  el.className = "bmk-b-" + type;
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(el._t);
  if(ttl) el._t = setTimeout(() => { el.style.display = "none"; }, ttl);
}
function bmkHideBanner(){
  const el = document.getElementById("bmk-banner");
  if(el) el.style.display = "none";
}
function bmkStatus(text){
  let el = document.getElementById("bmk-status");
  if(!el){
    el = document.createElement("div");
    el.id = "bmk-status";
    el.title = "點擊停止獵號";
    el.addEventListener("click", () => bmkHuntStop());
    document.documentElement.appendChild(el);
  }
  el.textContent = text + "　✕";
  el.style.display = "block";
}
function bmkHideStatus(){
  const el = document.getElementById("bmk-status");
  if(el) el.style.display = "none";
}

// ---------- 學習下一頁按鈕（找不到時請使用者示範一次） ----------
function bmkNextKey(){ return "bmk-next:" + location.host; }
function bmkLearnedNext(){
  const sel = localStorage.getItem(bmkNextKey());
  if(!sel) return null;
  try{
    const el = document.querySelector(sel);
    if(el && el.offsetParent) return el;
  }catch(e){}
  return null;
}
function bmkBuildSelector(el){
  const al = el.getAttribute && el.getAttribute("aria-label");
  if(el.id) return "#" + CSS.escape(el.id);
  if(al) return el.tagName.toLowerCase() + '[aria-label="' + al.replace(/"/g, '\\"') + '"]';
  const path = [];
  let cur = el;
  for(let depth = 0; cur && depth < 4 && cur !== document.body; depth++){
    let seg = cur.tagName.toLowerCase();
    seg += [...cur.classList].slice(0, 2).map(c => "." + CSS.escape(c)).join("");
    path.unshift(seg);
    if(cur.id){ path[0] = "#" + CSS.escape(cur.id); break; }
    cur = cur.parentElement;
  }
  return path.join(" > ");
}

function bmkHuntStop(save = true){
  if(hunt){ clearTimeout(hunt.timer); hunt = null; }
  if(save) sessionStorage.removeItem("bmk-hunt");
  bmkHideStatus();
}

function bmkHuntTick(){
  if(!hunt) return;
  hunt.round++;
  bmkStatus(`獵號中・第 ${hunt.round} 頁・門檻 ${hunt.threshold} 分` +
    (hunt.exclude ? `・排除 ${[...hunt.exclude].join(" ")}` : ""));
  bmkScan();
  const hits = [...document.querySelectorAll(".bmk-badge")].filter(b => {
    if(parseInt(b.textContent) < hunt.threshold) return false;
    if(hunt.exclude){
      const digits = (b.href.split("n=")[1] || "").split("&")[0];
      const core = digits.slice(2); // 前兩碼不計，比照書中與塔克夏規則
      for(const ch of hunt.exclude) if(core.includes(ch)) return false;
    }
    return true;
  });
  if(hits.length){
    hits.forEach(b => b.classList.add("bmk-hit"));
    hits[0].scrollIntoView({ behavior: "smooth", block: "center" });
    const list = hits.slice(0, 5).map(b =>
      b.href.split("n=")[1].split("&")[0] + "（" + parseInt(b.textContent) + " 分" + (b.textContent.includes("!") ? "，含大凶" : "") + "）"
    ).join("\n");
    chrome.runtime.sendMessage({
      cmd: "notify", sticky: true,
      title: `找到 ${hits.length} 個 ${hunt.threshold} 分以上的號碼！`,
      body: list + (hits.length > 5 ? `\n⋯共 ${hits.length} 個` : "")
    });
    bmkBanner(`🎉 找到 ${hits.length} 個 ${hunt.threshold} 分以上的號碼！已標亮並停在本頁`, "ok", 15000);
    bmkHuntStop();
    return;
  }
  // 這一頁還沒掃到任何號碼：可能內容還在載入或需要捲動觸發，捲到底部並等待，最多 4 輪
  const badgeCount = document.querySelectorAll(".bmk-badge").length;
  if(badgeCount === 0){
    hunt.emptyWait = (hunt.emptyWait || 0) + 1;
    if(hunt.emptyWait <= 4){
      window.scrollTo(0, document.body.scrollHeight);
      hunt.timer = setTimeout(bmkHuntTick, 2500);
      return;
    }
  } else {
    hunt.emptyWait = 0;
  }

  const sig = bmkPageSig();
  hunt.sameCount = (sig === hunt.lastSig) ? hunt.sameCount + 1 : 0;
  hunt.lastSig = sig;
  if(hunt.sameCount >= 4){
    chrome.runtime.sendMessage({ cmd: "notify", title: "獵號結束", body: "頁面不再變化（可能已是最後一頁），未找到達標號碼。" });
    bmkBanner("獵號結束：頁面不再變化（可能已是最後一頁），未找到達標號碼。", "warn");
    bmkHuntStop();
    return;
  }
  const next = bmkLearnedNext() || bmkFindNext();
  if(!next){
    // 教學模式：請使用者示範點一次下一頁
    bmkBanner("找不到「下一頁」按鈕。請直接點一次網頁上的下一頁，插件會記住位置並自動接手。", "warn", 0);
    const onTeach = e => {
      if(!hunt) return;
      const t = e.target.closest("a,button,[role='button'],li,span,div") || e.target;
      localStorage.setItem(bmkNextKey(), bmkBuildSelector(t));
      bmkBanner("已記住下一頁按鈕，獵號繼續。", "ok", 4000);
      hunt.timer = setTimeout(bmkHuntTick, 2500);
    };
    document.addEventListener("click", onTeach, { capture: true, once: true });
    return;
  }
  next.click();
  // 網頁反應慢時：上一輪點擊沒換頁（sameCount > 0），這次多等一點再確認與重按
  hunt.timer = setTimeout(bmkHuntTick, hunt.sameCount > 0 ? 3200 : 2200 + Math.random() * 800);
}

function bmkHuntStart(threshold, exclude = ""){
  bmkHuntStop(false);
  hunt = { threshold, exclude, timer: null, sameCount: 0, lastSig: "", round: 0 };
  sessionStorage.setItem("bmk-hunt", JSON.stringify({ threshold, exclude }));
  bmkBanner(`獵號模式啟動：自動翻頁掃描，${threshold} 分以上會通知` +
    (exclude ? `（排除含 ${[...exclude].join("、")} 的號碼）` : "") + `。點右下角 ✕ 可停止。`, "info", 5000);
  bmkHuntTick();
}

// 整頁重載型網站：續跑獵號
if(sessionStorage.getItem("bmk-hunt") !== null){
  let saved = {};
  try{ saved = JSON.parse(sessionStorage.getItem("bmk-hunt")) || {}; }
  catch(e){ saved = { threshold: Number(sessionStorage.getItem("bmk-hunt")) }; }
  setTimeout(() => { if(!hunt && saved.threshold) bmkHuntStart(saved.threshold, saved.exclude || ""); }, 1800);
}

chrome.runtime.onMessage.addListener(msg => {
  if(msg.cmd === "rescan"){
    bmkDay = msg.day ?? bmkDay;
    bmkClear();
    bmkScan();
    bmkStartObserver();
  } else if(msg.cmd === "clear"){
    bmkClear();
    bmkStopObserver();
  } else if(msg.cmd === "hunt-start"){
    bmkDay = msg.day ?? bmkDay;
    bmkHuntStart(Number(msg.threshold) || 95, msg.exclude || "");
  } else if(msg.cmd === "hunt-stop"){
    bmkHuntStop();
  }
});

chrome.storage.onChanged.addListener(changes => {
  if(changes.day){ bmkDay = changes.day.newValue; bmkClear(); bmkScan(); }
  if(changes.auto){
    bmkAuto = changes.auto.newValue;
    if(bmkAuto){ bmkScan(); bmkStartObserver(); }
    else { bmkClear(); bmkStopObserver(); }
  }
});
