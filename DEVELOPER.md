# Developer Guide

This document covers the architecture, file structure, and contribution workflow for the **Text Saver to Firebase** Chrome extension.

## Architecture Overview

The extension follows Chrome's **Manifest V3** architecture with three main runtime contexts:

```
┌─────────────────────────────────────────────────┐
│  Chrome Browser                                 │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  Popup UI    │    │  Background Service   │  │
│  │              │    │  Worker               │  │
│  │ popup.html   │    │                       │  │
│  │ popup.css    │    │  background.js        │  │
│  │ popup.js     │    │  - Context menu       │  │
│  │              │    │  - Badge feedback      │  │
│  └──────┬───────┘    └───────────┬───────────┘  │
│         │                        │              │
│         ▼                        ▼              │
│  ┌──────────────────────────────────────────┐   │
│  │  Firebase (Firestore)                    │   │
│  │                                          │   │
│  │  firebase-config.js   (popup context)    │   │
│  │  importScripts(...)   (worker context)   │   │
│  │                                          │   │
│  │  Collection: savedTexts                  │   │
│  │  ├── { text, source, pageUrl, createdAt }│   │
│  │  └── ...                                 │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Two separate Firebase initializations** exist because the popup and the background service worker run in isolated JavaScript contexts and cannot share global variables.

## Project Structure

```
Voice-flow-extetion/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker: context menu + Firebase writes
├── firebase-config.js     # Firebase init + helper functions (popup context)
├── popup.html             # Popup markup
├── popup.css              # Popup styles
├── popup.js               # Popup logic: save, history, keyboard shortcuts
├── setup.sh               # Downloads Firebase SDK compat files
├── icons/
│   ├── icon16.png         # Toolbar icon
│   ├── icon48.png         # Extensions page icon
│   └── icon128.png        # Chrome Web Store icon
├── libs/                  # Firebase SDK (downloaded, gitignored)
│   ├── README.md          # Instructions for getting the SDK files
│   ├── firebase-app-compat.js       # (downloaded by setup.sh)
│   └── firebase-firestore-compat.js # (downloaded by setup.sh)
├── .gitignore
├── README.md              # User-facing documentation
└── DEVELOPER.md           # This file
```

## Key Files in Detail

### `manifest.json`

- **Manifest V3** — uses `service_worker` (not `background.scripts`).
- Permissions: `contextMenus`, `activeTab`, `storage`.
- Content Security Policy restricts scripts to `'self'` only, which is why the Firebase SDK must be bundled locally in `libs/`.

### `firebase-config.js`

Loaded by the popup via `<script>` tags. Exposes two global functions:

| Function | Purpose |
|----------|---------|
| `saveTextToFirebase(text, source, pageUrl)` | Writes a document to the `savedTexts` collection. Returns the new document ID. |
| `getRecentTexts(limit)` | Reads the most recent `limit` documents, ordered by `createdAt` descending. |

### `background.js`

The service worker runs independently of the popup. It:

1. Registers a context menu item (`chrome.contextMenus.create`) on `chrome.runtime.onInstalled`.
2. Listens for `chrome.contextMenus.onClicked` and writes directly to Firestore.
3. Uses `chrome.action.setBadgeText` to flash "OK" or "ERR" on the extension icon as visual feedback.

Because service workers cannot access DOM-based `<script>` tags, Firebase is loaded via `importScripts()`.

### `popup.js`

Handles all popup interactions:

- **Save button** — Validates input, calls `saveTextToFirebase()`, refreshes the history list.
- **Keyboard shortcut** — `Ctrl+Enter` / `Cmd+Enter` triggers save.
- **History rendering** — Fetches recent saves and renders them with source badges, truncated text, and page URLs.
- **XSS prevention** — All user-generated text is escaped via DOM `createTextNode` before rendering as innerHTML.

## Development Workflow

### Prerequisites

- Google Chrome (or a Chromium-based browser)
- A Firebase project with Firestore enabled
- `curl` (for `setup.sh`)

### Getting started

```bash
# 1. Clone the repository
git clone https://github.com/addisualemu/Voice-flow-extetion.git
cd Voice-flow-extetion

# 2. Download Firebase SDK
./setup.sh

# 3. Add your Firebase credentials to BOTH files:
#    - firebase-config.js  (lines 4-10)
#    - background.js       (lines 5-11)

# 4. Load in Chrome
#    chrome://extensions → Developer mode → Load unpacked → select this folder
```

### Making changes

1. Edit the source files.
2. Go to `chrome://extensions` and click the **reload** button on the extension card (circular arrow icon).
3. Re-open the popup or right-click on a page to test your changes.

There is no build step — the extension runs directly from source.

### Debugging

| Context | How to inspect |
|---------|----------------|
| **Popup** | Right-click the extension icon → **Inspect popup**. Opens DevTools for the popup page. |
| **Background service worker** | On `chrome://extensions`, click **Service worker** link under the extension card. Opens DevTools for the background script. |
| **Firestore data** | Use the [Firebase Console](https://console.firebase.google.com/) → Firestore Database to view, edit, or delete documents. |

### Common issues during development

| Issue | Cause | Fix |
|-------|-------|-----|
| `firebase is not defined` | SDK files missing in `libs/` | Run `./setup.sh` |
| Context menu not updating | Chrome caches the `onInstalled` listener | Remove and re-add the extension on `chrome://extensions` |
| Changes not reflected | Chrome caches extension files | Click reload on the extension card |
| `Permission denied` Firestore errors | Firestore security rules are too restrictive | Update rules in Firebase Console to allow reads/writes |

## Firebase Security Rules

For **development**, you can use open rules (not recommended for production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /savedTexts/{document} {
      allow read, write: if true;
    }
  }
}
```

For **production**, restrict access. For example, allow writes from anyone but only reads from authenticated users:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /savedTexts/{document} {
      allow create: if true;
      allow read: if request.auth != null;
    }
  }
}
```

## Extending the Extension

### Ideas for future work

- **Authentication** — Add Firebase Auth so saves are tied to a user account.
- **Delete / edit** — Allow users to remove or update saved snippets from the popup.
- **Tags / categories** — Let users label their saved texts for easier organization.
- **Search** — Add a search bar in the popup to filter saved texts.
- **Export** — Allow exporting saved texts as JSON or CSV.
- **Sync indicator** — Show online/offline status and queue saves when offline.

### Adding a new Firestore field

1. Update the `db.collection("savedTexts").add({...})` call in both `firebase-config.js:saveTextToFirebase()` and `background.js` (the context menu handler).
2. Update `getRecentTexts()` if the new field should appear in the popup.
3. Update the history rendering in `popup.js` to display the new field.

### Adding a new Chrome permission

1. Add the permission string to the `permissions` array in `manifest.json`.
2. Remove and re-load the extension — Chrome prompts the user to accept new permissions.

## Code Style

- Plain JavaScript (no framework, no build tools).
- `async/await` for all asynchronous operations.
- Functions use JSDoc comments for parameters and return types.
- CSS uses a minimal design system with an indigo (`#4f46e5`) accent color.
