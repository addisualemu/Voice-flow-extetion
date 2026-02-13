document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");
  const historyList = document.getElementById("historyList");
  const settingsLink = document.getElementById("settingsLink");
  
  let currentUserId = null;

  // Settings link click handler
  if (settingsLink) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    settingsLink.addEventListener("mouseenter", () => {
      settingsLink.style.backgroundColor = "#f3f4f6";
    });
    settingsLink.addEventListener("mouseleave", () => {
      settingsLink.style.backgroundColor = "transparent";
    });
  }

  // Load user ID and recent saves on popup open
  loadUserId();
  loadHistory();

  // Save button click handler
  saveBtn.addEventListener("click", async () => {
    const text = textInput.value.trim();
    if (!text) {
      showStatus("Please enter some text first.", "error");
      return;
    }

    // Check if user ID is configured
    if (!currentUserId) {
      showStatus("Please configure your User ID in settings.", "error");
      setTimeout(() => {
        const settingsLink = document.createElement("a");
        settingsLink.href = "#";
        settingsLink.textContent = "Open Settings";
        settingsLink.style.cssText = "color: #4f46e5; text-decoration: underline; cursor: pointer; font-size: 12px; margin-top: 4px; display: block;";
        settingsLink.onclick = (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        };
        statusEl.appendChild(settingsLink);
      }, 100);
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      await saveTextToFirebase(text, currentUserId);
      textInput.value = "";
      showStatus("Text saved successfully!", "success");
      loadHistory();
    } catch (err) {
      const errorMsg = err.message && (err.message.includes("API key not found") || err.message.includes("configuration not found"))
        ? "Firebase API key not configured. Please set up your Firebase API key in settings."
        : err.message && err.message.includes("User ID")
        ? "Please configure your User ID in settings."
        : "Failed to save. Check your Firebase config in settings.";
      showStatus(errorMsg, "error");
      // Show settings link if API key is missing
      if (err.message && (err.message.includes("API key not found") || err.message.includes("configuration not found") || err.message.includes("User ID"))) {
        setTimeout(() => {
          const settingsLink = document.createElement("a");
          settingsLink.href = "#";
          settingsLink.textContent = "Open Settings";
          settingsLink.style.cssText = "color: #4f46e5; text-decoration: underline; cursor: pointer; font-size: 12px; margin-top: 4px; display: block;";
          settingsLink.onclick = (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
          };
          statusEl.appendChild(settingsLink);
        }, 100);
      }
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

  // Load user ID from settings
  async function loadUserId() {
    try {
      const result = await chrome.storage.sync.get(["userId"]);
      if (result.userId) {
        currentUserId = result.userId;
      } else {
        historyList.innerHTML = '<li class="empty-state">Please configure your User ID in settings to use this extension.</li>';
      }
    } catch (error) {
      console.error("Error loading user ID:", error);
    }
  }

  // Load and render recent saved texts
  async function loadHistory() {
    if (!currentUserId) {
      return; // Already shown message in loadUserId
    }

    try {
      const texts = await getRecentTexts(10, currentUserId);

      if (texts.length === 0) {
        historyList.innerHTML =
          '<li class="empty-state">No saved texts yet.</li>';
        return;
      }

      historyList.innerHTML = texts
        .map((item) => {
          const truncated =
            item.detail && item.detail.length > 120
              ? item.detail.substring(0, 120) + "…"
              : item.detail || "";
          const stage = item.stage || "Entry";
          const completed = item.completed ? "✓" : "○";

          return `<li>
            <span class="source-badge">${stage}</span>
            <span style="margin-left: 4px; color: ${item.completed ? '#10b981' : '#6b7280'}; font-size: 12px;">${completed}</span>
            <span class="text-content">${escapeHtml(truncated)}</span>
          </li>`;
        })
        .join("");
    } catch (err) {
      const errorMsg = err.message && (err.message.includes("API key not found") || err.message.includes("configuration not found"))
        ? "Firebase API key not configured. <a href='#' id='settingsLink' style='color: #4f46e5; text-decoration: underline;'>Open Settings</a>"
        : "Could not load history.";
      historyList.innerHTML = `<li class="empty-state">${errorMsg}</li>`;
      
      // Add click handler for settings link
      const settingsLink = document.getElementById("settingsLink");
      if (settingsLink) {
        settingsLink.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        });
      }
    }
  }

  // Escape HTML to prevent XSS when rendering user text
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
});
