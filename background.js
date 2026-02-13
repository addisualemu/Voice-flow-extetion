// Import Firebase SDKs for the service worker context
importScripts("libs/firebase-app-compat.js", "libs/firebase-firestore-compat.js");

// Hardcoded Firebase configuration values (only API key is user-configurable)
const FIREBASE_CONFIG = {
  authDomain: "studio-6322617027-3e57b.firebaseapp.com",
  projectId: "studio-6322617027-3e57b",
  storageBucket: "studio-6322617027-3e57b.firebasestorage.app",
  messagingSenderId: "634923058356",
  appId: "1:634923058356:web:241b9a6016cb37523443e1"
};

// Firebase configuration loaded from storage
let firebaseConfig = null;
let db = null;
let firebaseInitialized = false;

/**
 * Initialize Firebase with configuration from storage
 */
async function initializeFirebase() {
  if (firebaseInitialized && db) {
    return db;
  }

  try {
    // Load API key from chrome.storage
    const result = await chrome.storage.sync.get("firebaseApiKey");
    
    if (!result.firebaseApiKey) {
      throw new Error("Firebase API key not found. Please configure it in the extension settings.");
    }

    // Combine user's API key with hardcoded config
    firebaseConfig = {
      apiKey: result.firebaseApiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      projectId: FIREBASE_CONFIG.projectId,
      storageBucket: FIREBASE_CONFIG.storageBucket,
      messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
      appId: FIREBASE_CONFIG.appId
    };

    // Validate API key is present
    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase API key is missing. Please check your settings.");
    }

    // Reinitialize if already initialized (for config updates)
    if (firebaseInitialized) {
      try {
        firebase.app().delete();
      } catch (e) {
        // App might not exist yet
      }
    }

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseInitialized = true;

    return db;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    throw error;
  }
}

// Listen for config changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && (changes.firebaseApiKey || changes.userId)) {
    // Reset initialization when API key changes
    firebaseInitialized = false;
    firebaseConfig = null;
    db = null;
  }
});

// Listen for reload config message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "reloadConfig") {
    firebaseInitialized = false;
    firebaseConfig = null;
    db = null;
    sendResponse({ success: true });
    return true;
  }
});

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveSelectedText",
    title: 'Save "%s" to Firebase',
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveSelectedText" && info.selectionText) {
    try {
      // Get user ID from settings
      const result = await chrome.storage.sync.get("userId");
      if (!result.userId) {
        chrome.action.setBadgeText({ text: "NO ID", tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({
          color: "#f59e0b",
          tabId: tab.id
        });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 3000);
        return;
      }

      const db = await initializeFirebase();
      const userId = result.userId;
      
      // Save to users/{userId}/tasks/{taskId}
      await db.collection("users").doc(userId).collection("tasks").add({
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        detail: info.selectionText,
        stage: "Entry"
      });

      // Show a badge briefly to confirm save
      chrome.action.setBadgeText({ text: "OK", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#4f46e5",
        tabId: tab.id
      });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 2000);
    } catch (error) {
      console.error("Error saving selected text:", error);

      chrome.action.setBadgeText({ text: "ERR", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: "#dc2626",
        tabId: tab.id
      });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }, 2000);
    }
  }
});
