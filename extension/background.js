// 通知服務：content script 找到高分號碼時發系統通知，點通知跳回該分頁
const notifTabs = {};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if(msg.cmd === "notify"){
    const id = "bmk-" + Date.now();
    if(sender.tab) notifTabs[id] = { tabId: sender.tab.id, windowId: sender.tab.windowId };
    chrome.notifications.create(id, {
      type: "basic",
      iconUrl: "icon128.png",
      title: msg.title,
      message: msg.body,
      priority: 2,
      requireInteraction: !!msg.sticky
    });
  }
});

chrome.notifications.onClicked.addListener(id => {
  const t = notifTabs[id];
  if(t){
    chrome.windows.update(t.windowId, { focused: true });
    chrome.tabs.update(t.tabId, { active: true });
    delete notifTabs[id];
  }
  chrome.notifications.clear(id);
});
