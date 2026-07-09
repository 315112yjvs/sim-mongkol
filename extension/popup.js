const autoEl = document.getElementById("auto");
const dayEl = document.getElementById("day");

chrome.storage.sync.get({ auto: true, day: "" }, cfg => {
  autoEl.checked = cfg.auto;
  dayEl.value = cfg.day;
});

autoEl.addEventListener("change", () => chrome.storage.sync.set({ auto: autoEl.checked }));
dayEl.addEventListener("change", () => chrome.storage.sync.set({ day: dayEl.value }));

document.getElementById("rescan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if(tab?.id) chrome.tabs.sendMessage(tab.id, { cmd: "rescan", day: dayEl.value }).catch(() => {});
  window.close();
});
