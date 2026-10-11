// Context-menu saves run in the service worker, which has no localStorage.
// Firebase Auth keeps the session in localStorage, so the write is done
// from the offscreen document, which shares storage with the popup and options page.

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
    justification: "Firebase Auth keeps the signed-in session in localStorage so selected text can be saved."
  });
}

async function saveThroughOffscreen(text) {
  await ensureOffscreen();
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await chrome.runtime.sendMessage({ type: "save-text", text });
      if (response) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw lastError || new Error("Could not save.");
}

function setBadge(tabId, text, color, ms) {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "", tabId });
  }, ms);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSelectedText",
    title: 'Save "%s" to Firebase',
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "saveSelectedText" || !info.selectionText) {
    return;
  }

  const text = info.selectionText.trim();
  if (!text || !tab || tab.id == null) {
    return;
  }

  try {
    const response = await saveThroughOffscreen(text);

    if (!response || !response.ok) {
      const message = (response && response.error) || "";
      if (message.includes("Not connected") || message.includes("PIN")) {
        setBadge(tab.id, "PIN", "#f59e0b", 3000);
        return;
      }
      throw new Error(message || "Failed to save.");
    }

    setBadge(tab.id, "OK", "#4f46e5", 2000);
  } catch (error) {
    console.error("Error saving selected text:", error);
    setBadge(tab.id, "ERR", "#dc2626", 2000);
  }
});
