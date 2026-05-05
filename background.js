async function setBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#d62828" });
}

async function broadcast(enabled) {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (t.id == null) continue;
    try {
      await chrome.tabs.sendMessage(t.id, {
        type: "IP_REDACT_TOGGLE",
        enabled,
      });
    } catch {
      // tab may not have a content script (chrome:// pages, etc.) — ignore
    }
  }
}

chrome.action.onClicked.addListener(async () => {
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  const next = !enabled;
  await chrome.storage.local.set({ enabled: next });
  await setBadge(next);
  await broadcast(next);
});

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  await setBadge(!!enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  await setBadge(!!enabled);
});
