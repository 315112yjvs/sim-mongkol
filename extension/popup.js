const autoEl = document.getElementById("auto");
const dayEl = document.getElementById("day");

chrome.storage.sync.get({ auto: true, day: "" }, cfg => {
  autoEl.checked = cfg.auto;
  dayEl.value = cfg.day;
});

autoEl.addEventListener("change", () => chrome.storage.sync.set({ auto: autoEl.checked }));
dayEl.addEventListener("change", () => chrome.storage.sync.set({ day: dayEl.value }));

const sendToTab = async payload => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if(tab?.id) chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
};

document.getElementById("rescan").addEventListener("click", async () => {
  await sendToTab({ cmd: "rescan", day: dayEl.value });
  window.close();
});

const thEl = document.getElementById("threshold");
chrome.storage.sync.get({ threshold: 95 }, cfg => { thEl.value = cfg.threshold; });
thEl.addEventListener("change", () => chrome.storage.sync.set({ threshold: Number(thEl.value) || 95 }));

document.getElementById("huntStart").addEventListener("click", async () => {
  await sendToTab({ cmd: "hunt-start", threshold: Number(thEl.value) || 95, day: dayEl.value });
  window.close();
});
document.getElementById("huntStop").addEventListener("click", async () => {
  await sendToTab({ cmd: "hunt-stop" });
  window.close();
});
