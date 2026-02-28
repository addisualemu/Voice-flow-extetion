document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");
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

  // Load user ID on popup open
  loadUserId();

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
      }
    } catch (error) {
      console.error("Error loading user ID:", error);
    }
  }
});
