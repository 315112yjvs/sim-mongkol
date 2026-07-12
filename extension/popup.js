const autoEl = document.getElementById("auto");
const dayEl = document.getElementById("day");

chrome.storage.sync.get({ auto: true, day: "" }, cfg => {
  autoEl.checked = cfg.auto;
  dayEl.value = cfg.day;
});

autoEl.addEventListener("change", () => chrome.storage.sync.set({ auto: autoEl.checked }));
dayEl.addEventListener("change", () => chrome.storage.sync.set({ day: dayEl.value }));

const errEl = document.getElementById("err");
const sendToTab = async payload => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if(!tab?.id) return false;
  try{
    await chrome.tabs.sendMessage(tab.id, payload);
    return true;
  }catch(e){
    return false;
  }
};
const run = async payload => {
  errEl.style.display = "none";
  const ok = await sendToTab(payload);
  if(ok){ window.close(); }
  else{
    errEl.textContent = "無法連線此網頁。請先重新整理該網頁（⌘R）再點一次；剛更新插件後舊分頁都需要重新整理。";
    errEl.style.display = "block";
  }
};

document.getElementById("rescan").addEventListener("click", () => run({ cmd: "rescan", day: dayEl.value }));

const thEl = document.getElementById("threshold");
chrome.storage.sync.get({ threshold: 95 }, cfg => { thEl.value = cfg.threshold; });
thEl.addEventListener("change", () => chrome.storage.sync.set({ threshold: Number(thEl.value) || 95 }));

// 排除數字 0-9 圓形切換鈕
const chipsEl = document.getElementById("digitChips");
let exclude = "";
for(let d = 0; d <= 9; d++){
  const b = document.createElement("button");
  b.textContent = d;
  b.addEventListener("click", () => {
    const ch = String(d);
    exclude = exclude.includes(ch) ? exclude.replace(ch, "") : exclude + ch;
    b.classList.toggle("on");
    chrome.storage.sync.set({ exclude });
  });
  chipsEl.appendChild(b);
}
chrome.storage.sync.get({ exclude: "" }, cfg => {
  exclude = cfg.exclude;
  [...chipsEl.children].forEach((b, i) => { if(exclude.includes(String(i))) b.classList.add("on"); });
});

document.getElementById("huntStart").addEventListener("click", () =>
  run({ cmd: "hunt-start", threshold: Number(thEl.value) || 95, day: dayEl.value, exclude }));
document.getElementById("huntStop").addEventListener("click", () => run({ cmd: "hunt-stop" }));
