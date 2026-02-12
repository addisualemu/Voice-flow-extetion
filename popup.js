document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");
  const historyList = document.getElementById("historyList");

  // Load recent saves on popup open
  loadHistory();

  // Save button click handler
  saveBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    if (!text) {
      showStatus("Please enter some text first.", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      await saveTextToFirebase(text, "manual");
      textInput.value = "";
      showStatus("Text saved successfully!", "success");
      loadHistory();
    } catch (err) {
      showStatus("Failed to save. Check your Firebase config.", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save to Firebase";
    }
  });

  // Allow Ctrl+Enter / Cmd+Enter to save
  textInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      saveBtn.click();
    }
  });

  // Show a status message that auto-hides after 3 seconds
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    setTimeout(() => {
      statusEl.className = "status hidden";
    }, 3000);
  }

  // Load and render recent saved texts
  async function loadHistory() {
    try {
      const texts = await getRecentTexts(10);

      if (texts.length === 0) {
        historyList.innerHTML =
          '<li class="empty-state">No saved texts yet.</li>';
        return;
      }

      historyList.innerHTML = texts
        .map((item) => {
          const badge = item.source === "selection" ? "selection" : "manual";
          const truncated =
            item.text.length > 120
              ? item.text.substring(0, 120) + "…"
              : item.text;
          const meta = item.pageUrl
            ? `<span class="meta">${escapeHtml(item.pageUrl)}</span>`
            : "";

          return `<li>
            <span class="source-badge ${badge}">${badge}</span>
            <span class="text-content">${escapeHtml(truncated)}</span>
            ${meta}
          </li>`;
        })
        .join("");
    } catch (err) {
      historyList.innerHTML =
        '<li class="empty-state">Could not load history.</li>';
    }
  }

  // Escape HTML to prevent XSS when rendering user text
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
});
