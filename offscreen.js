chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "save-text") {
    return;
  }

  saveTextToFirebase(message.text)
    .then((id) => sendResponse({ ok: true, id }))
    .catch((error) => {
      sendResponse({ ok: false, error: error.message || "Failed to save." });
    });

  return true;
});
