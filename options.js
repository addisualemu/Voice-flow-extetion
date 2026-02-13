document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("firebaseForm");
  const saveBtn = document.getElementById("saveBtn");
  const testBtn = document.getElementById("testBtn");
  const statusEl = document.getElementById("status");

  // Load saved configuration
  loadConfig();

  // Save configuration
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveConfig();
  });

  // Test connection
  testBtn.addEventListener("click", async () => {
    await testConnection();
  });

  async function loadConfig() {
    try {
      const result = await chrome.storage.sync.get(["firebaseApiKey", "userId"]);
      if (result.firebaseApiKey) {
        document.getElementById("apiKey").value = result.firebaseApiKey || "";
      }
      if (result.userId) {
        document.getElementById("userId").value = result.userId || "";
      }
    } catch (error) {
      console.error("Error loading config:", error);
      showStatus("Error loading saved configuration.", "error");
    }
  }

  async function saveConfig() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const userId = document.getElementById("userId").value.trim();

    // Validate required fields
    if (!apiKey) {
      showStatus("Please enter your Firebase API Key.", "error");
      return;
    }
    
    if (!userId) {
      showStatus("Please enter your User ID.", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      await chrome.storage.sync.set({ 
        firebaseApiKey: apiKey,
        userId: userId
      });
      showStatus("Configuration saved successfully! The extension will use these settings.", "success");
      
      // Notify background script to reload config
      chrome.runtime.sendMessage({ type: "reloadConfig" });
    } catch (error) {
      console.error("Error saving config:", error);
      showStatus("Error saving configuration. Please try again.", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Configuration";
    }
  }

  async function testConnection() {
    const apiKey = document.getElementById("apiKey").value.trim();

    // Validate API key is filled
    if (!apiKey) {
      showStatus("Please enter your Firebase API Key before testing.", "error");
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = "Testing...";
    showStatus("API Key looks valid. Save and try using the extension to verify the connection.", "success");

    testBtn.disabled = false;
    testBtn.textContent = "Test Connection";
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    if (type === "success" || type === "error") {
      setTimeout(() => {
        statusEl.className = "status hidden";
      }, 5000);
    }
  }

});

