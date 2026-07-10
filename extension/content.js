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
      if(p.dataset.bmkDone) return NodeFilter.FILTER_REJECT;
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
  // 1. rel=next
  let el = document.querySelector("a[rel='next'],link[rel='next']+a");
  if(el) return el;
  // 2. aria-label / class 含 next
  for(const cand of document.querySelectorAll("[aria-label],[class*='next' i]")){
    const label = (cand.getAttribute("aria-label") || "").toLowerCase();
    const cls = (cand.className + "").toLowerCase();
    if(label.includes("next") || label.includes("下一") || /(^|[-_ ])next([-_ ]|$)/.test(cls)){
      const t = clickable(cand);
      if(t && t.offsetParent) return t;
    }
  }
  // 3. 箭頭符號
  const arrows = new Set([">", "›", "»", "❯", "→", "ถัดไป", "下一頁", "下頁"]);
  for(const cand of document.querySelectorAll("a,button,[role='button'],span,li")){
    if(cand.children.length > 1) continue;
    if(arrows.has(cand.textContent.trim())){
      const t = clickable(cand);
      if(t && t.offsetParent) return t;
    }
  }
  // 4. 頁碼：目前頁 +1
  const cur = document.querySelector("[aria-current]:not([aria-current='false']),[class*='active'],[class*='current'],[class*='selected']");
  if(cur){
    const n = parseInt(cur.textContent.trim());
    if(!isNaN(n)){
      for(const cand of document.querySelectorAll("a,button,[role='button'],li,span")){
        if(cand.textContent.trim() === String(n + 1)){
          const t = clickable(cand);
          if(t && t.offsetParent) return t;
        }
      }
    }
  }
  return null;
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
  bmkStatus(`獵號中・第 ${hunt.round} 頁・門檻 ${hunt.threshold} 分`);
  bmkScan();
  const hits = [...document.querySelectorAll(".bmk-badge")]
    .filter(b => parseInt(b.textContent) >= hunt.threshold);
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
  const sig = bmkPageSig();
  hunt.sameCount = (sig === hunt.lastSig) ? hunt.sameCount + 1 : 0;
  hunt.lastSig = sig;
  if(hunt.sameCount >= 3){
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
  hunt.timer = setTimeout(bmkHuntTick, 2200 + Math.random() * 800);
}

function bmkHuntStart(threshold){
  bmkHuntStop(false);
  hunt = { threshold, timer: null, sameCount: 0, lastSig: "", round: 0 };
  sessionStorage.setItem("bmk-hunt", String(threshold));
  bmkBanner(`獵號模式啟動：自動翻頁掃描，${threshold} 分以上會通知。點右下角 ✕ 可停止。`, "info", 5000);
  bmkHuntTick();
}

// 整頁重載型網站：續跑獵號
if(sessionStorage.getItem("bmk-hunt") !== null){
  const th = Number(sessionStorage.getItem("bmk-hunt"));
  setTimeout(() => { if(!hunt) bmkHuntStart(th); }, 1800);
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
    bmkHuntStart(Number(msg.threshold) || 95);
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
