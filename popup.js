document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const saveBtn = document.getElementById("saveBtn");
  const dictateBtn = document.getElementById("dictateBtn");
  const statusEl = document.getElementById("status");
  const settingsLink = document.getElementById("settingsLink");
  
  let currentUserId = null;
  let recognition = null;
  let isListening = false;
  let textBeforeDictate = "";
  let finalTranscript = "";
  let interimTranscript = "";

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

  // Stop recording (e.g. when user clicks input or saves)
  function stopRecording() {
    if (!recognition || !isListening) return;
    isListening = false;
    try { recognition.stop(); } catch (_) {}
    finalTranscript = "";
    interimTranscript = "";
    dictateBtn.classList.remove("listening");
    dictateBtn.disabled = false;
    dictateBtn.title = "Start voice dictate";
  }

  // Start recording (auto on popup open, or when user clicks mic after stopping)
  function startRecording() {
    if (!recognition || isListening) return;
    textBeforeDictate = textInput.value;
    finalTranscript = "";
    interimTranscript = "";
    isListening = true;
    dictateBtn.classList.add("listening");
    dictateBtn.title = "Stop dictate (click input or mic)";
    dictateBtn.disabled = true;
    try {
      recognition.start();
      dictateBtn.disabled = false;
      showStatus("Listening… Speak or click input to stop.", "success");
    } catch (err) {
      isListening = false;
      dictateBtn.classList.remove("listening");
      dictateBtn.disabled = false;
      showStatus("Could not start voice input.", "error");
    }
  }

  // Save button click handler
  saveBtn.addEventListener("click", async () => {
    stopRecording();
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

  // Click/focus on input stops recording (user can resume with mic button)
  textInput.addEventListener("focus", () => {
    if (isListening) {
      stopRecording();
      showStatus("Recording stopped. Click 🎤 to start again.", "success");
    }
  });

  // Allow Ctrl+Enter / Cmd+Enter to save
  textInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      saveBtn.click();
    }
  });

  // Voice dictate (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && dictateBtn) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      interimTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }
      textInput.value = textBeforeDictate + finalTranscript + interimTranscript;
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (_) {}
      } else {
        dictateBtn.classList.remove("listening");
        dictateBtn.disabled = false;
        dictateBtn.title = "Start voice dictate";
      }
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        statusEl.textContent = "Chrome didn’t ask for mic (common for extensions). Allow it below:";
        statusEl.className = "status error";
        const micLink = document.createElement("a");
        micLink.href = "#";
        micLink.textContent = "Open microphone settings →";
        micLink.style.cssText = "color: #4f46e5; text-decoration: underline; cursor: pointer; font-size: 12px; margin-top: 6px; display: block;";
        micLink.onclick = (ev) => {
          ev.preventDefault();
          chrome.tabs.create({ url: "chrome://extensions/?id=jflaoljfdinoamlgliflagnjhmokamec" });
        };
        statusEl.appendChild(micLink);
        setTimeout(() => {
          statusEl.className = "status hidden";
        }, 20000);
      } else if (e.error !== "aborted") {
        showStatus("Voice input error: " + (e.error || "unknown"), "error");
      }
      isListening = false;
      dictateBtn.classList.remove("listening");
      dictateBtn.disabled = false;
    };

    dictateBtn.addEventListener("click", () => {
      if (isListening) {
        stopRecording();
        return;
      }
      startRecording();
    });

    // Auto-start recording shortly after popup opens
    setTimeout(() => startRecording(), 400);
  } else if (dictateBtn) {
    dictateBtn.style.display = "none";
  }

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
