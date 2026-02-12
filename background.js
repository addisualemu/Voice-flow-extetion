// Import Firebase SDKs for the service worker context
importScripts("libs/firebase-app-compat.js", "libs/firebase-firestore-compat.js");

// Firebase configuration — must match firebase-config.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
      await db.collection("savedTexts").add({
        text: info.selectionText,
        source: "selection",
        pageUrl: tab?.url || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
