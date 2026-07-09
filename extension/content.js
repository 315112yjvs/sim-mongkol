// 掃描頁面文字中的泰國手機號碼，在旁邊插入分數標籤
// 支援 092-867-5576 / 092 867 5576 / 0928675576 / +66 92-867-5576
const BMK_RE = /(?:\+?66[-\s]?|0)[689]\d(?:[-\s]?\d{3})(?:[-\s]?\d{4})/g;
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

chrome.runtime.onMessage.addListener(msg => {
  if(msg.cmd === "rescan"){
    bmkDay = msg.day ?? bmkDay;
    bmkClear();
    bmkScan();
    bmkStartObserver();
  } else if(msg.cmd === "clear"){
    bmkClear();
    bmkStopObserver();
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
