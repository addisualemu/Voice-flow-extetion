# Text Saver to Firebase — Chrome Extension

A Chrome extension that lets you save short text snippets to a Firebase Firestore database. You can type text directly or highlight text on any web page and save it with a right-click.

## Features

- **Direct input** — Click the extension icon to open a popup, type or paste text, and save it instantly.
- **Right-click to save** — Select any text on a web page, right-click, and choose **Save "..." to Firebase** from the context menu.
- **Recent saves** — The popup shows your 10 most recent saved snippets with labels indicating whether each was typed manually or selected from a page.
- **Page URL tracking** — When you save selected text, the source page URL is stored alongside it.
- **Keyboard shortcut** — Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) inside the popup to save quickly.

## Installation

### 1. Download or clone this repository

```bash
git clone https://github.com/addisualemu/Voice-flow-extetion.git
cd Voice-flow-extetion
```

### 2. Download the Firebase SDK

Run the setup script to fetch the required Firebase libraries:

```bash
./setup.sh
```

This downloads two files into the `libs/` folder:
- `firebase-app-compat.js`
- `firebase-firestore-compat.js`

### 3. Set up a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. In **Project Settings > General**, scroll to **Your apps** and click **Add app > Web**.
3. Copy the config object — you will need `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
4. In the Firebase Console, go to **Firestore Database** and click **Create database**. Choose either production or test mode.

### 4. Add your Firebase credentials

Open these two files and replace the `YOUR_*` placeholders with your actual Firebase project values:

- **`firebase-config.js`** (used by the popup)
- **`background.js`** (used by the background service worker)

Both files contain the same config block at the top:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 5. Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `Voice-flow-extetion` project folder.
5. The **Text Saver** icon will appear in your toolbar.

## Usage

### Save text manually

1. Click the **Text Saver** icon in the Chrome toolbar.
2. Type or paste text into the text area.
3. Click **Save to Firebase** (or press `Ctrl+Enter`).
4. A green confirmation message appears, and the text shows up in **Recent Saves**.

### Save selected text from a web page

1. Highlight any text on a web page.
2. Right-click the selection.
3. Choose **Save "..." to Firebase** from the context menu.
4. A brief **OK** badge appears on the extension icon to confirm the save.

### View recent saves

Open the popup at any time to see your 10 most recent saved texts. Each entry shows:
- A **manual** or **selection** badge indicating how it was saved.
- The saved text (truncated if longer than 120 characters).
- The source page URL (for selections).

## Firestore Data Structure

All texts are stored in the `savedTexts` collection. Each document contains:

| Field       | Type      | Description                                      |
|-------------|-----------|--------------------------------------------------|
| `text`      | string    | The saved text content                           |
| `source`    | string    | `"manual"` (typed in popup) or `"selection"` (right-click) |
| `pageUrl`   | string    | URL of the source page (empty for manual entries)|
| `createdAt` | timestamp | Server-generated creation timestamp              |

## Troubleshooting

| Problem                        | Solution                                                                 |
|--------------------------------|--------------------------------------------------------------------------|
| "Failed to save" error         | Double-check your Firebase config values in both `firebase-config.js` and `background.js`. |
| Context menu doesn't appear    | Make sure you've selected text first. The menu only shows for text selections. |
| Extension icon missing         | Check `chrome://extensions` — make sure the extension is enabled.        |
| "Could not load history"       | Verify that Firestore is enabled in your Firebase project and that security rules allow reads. |
| Popup is blank                 | Ensure you ran `./setup.sh` so the Firebase SDK files exist in `libs/`. |

## Permissions

This extension requests the following Chrome permissions:

- **`contextMenus`** — To add the "Save to Firebase" right-click menu item.
- **`activeTab`** — To read the URL of the current tab when saving selected text.
- **`storage`** — Reserved for future local caching features.

## License

MIT
