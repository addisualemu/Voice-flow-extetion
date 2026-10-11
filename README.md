# Voice Flow

Chrome extension that captures text — typed, dictated, or selected on a page — and saves it as a task in Cloud Firestore for the [Voice Flow Studio](https://studio-6322617027-3e57b.web.app/) app.

## What it is

Voice Flow is a Manifest V3 Chrome extension. It gives you three ways to capture text:

- **Popup.** Open the toolbar popup, type or paste text, and click **Save**.
- **Voice dictate.** The popup starts the browser speech recognizer (`en-US`) when it opens. Spoken words are written into the text box. Click the mic or focus the text box to stop.
- **Right-click.** Select text on any page and choose **Save to Firebase**.

Each save creates a document at `users/{uid}/tasks/{taskId}`:

| Field | Value |
| --- | --- |
| `detail` | The captured text |
| `completed` | `false` |
| `stage` | `"Entry"` |
| `createdAt` | Server timestamp |

`uid` is the Firebase Authentication user id. You do not type it, and you do not type an API key. You connect once with the connection PIN from Voice Flow Studio.

## How it does it

```
Voice Flow Studio                Extension settings
generate PIN                     user enters PIN
     |                                |
     v                                v
linkingPins/{pin}  <--- Admin SDK --- linkWithPin (Cloud Function)
{ userId }                              |
                                        | custom token
                                        v
                                 Firebase Auth session
                                        |
                    popup or context menu
                                        |
                                        v
                                 users/{uid}/tasks
```

1. **Install the extension.** Run `./setup.sh`, then in Chrome open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select this folder.
2. **Deploy the linker** (once per project). See below. The extension cannot connect until `linkWithPin` is deployed.
3. **Connect.** In Voice Flow Studio, copy the connection PIN. Open the extension’s settings (the gear in the popup) and enter that PIN. The extension sends the PIN to `linkWithPin` and signs in. The PIN is not saved on the computer.
4. **Save.** The popup writes the task directly. A right-click save is handled by the service worker, which asks an offscreen page to write, because the service worker has no `localStorage` and that is where the Firebase session lives.

The Firebase web config, including the API key, is in `firebase-config.js`. It is the same public client config the website already ships. End users never paste it.

## How authorization works on Firebase

Firestore only accepts a task write when the caller is signed in as the owner of that path:

```
allow read, write: if request.auth != null && request.auth.uid == userId;
```

The extension gets that sign-in from the PIN, without ever reading `linkingPins` itself.

1. Studio, while you are signed in, stores `linkingPins/{pin}` with `userId` set to your Firebase uid. The rules only allow that create when `request.resource.data.userId == request.auth.uid`.
2. The extension sends the PIN to the `linkWithPin` Cloud Function over HTTPS.
3. The function reads that one document with the Admin SDK, which bypasses security rules. It checks that the `userId` is a real Firebase Auth user, then calls `createCustomToken(userId)`.
4. The extension calls `signInWithCustomToken`. Firebase Auth stores a refresh token in the extension’s `localStorage` and attaches a short-lived ID token to later Firestore requests.
5. The write goes to `users/{request.auth.uid}/tasks`. The rule above passes. A guess of someone else’s id does not, because the token’s uid is fixed.

The function is the only place that turns a PIN into an identity. It allows 5 attempts per IP and 10 attempts per PIN in a 15-minute window, and it answers with the same “not valid” message whether the PIN is missing or the account is gone. Attempt counters live in `pinLinkAttempts`, which has no client rule, so Firestore denies client reads and writes there.

A 6-digit PIN is still a short secret. The rate limit slows guessing. It does not make a short PIN as strong as a password. Keep the function deployed, and change the PIN in Studio if you think it has been exposed.

The API key is not authorization. Anyone can see it in the extension package, just as they can see it on the website. It only names the Firebase project. Access is enforced by the Auth token and the rules.

`linkingPins` is still readable by any signed-in Studio user (`allow read: if request.auth != null`). That is wider than the extension needs. The extension does not use that read. Owner-only reads (`resource.data.userId == request.auth.uid`) are safer if Studio can check PIN uniqueness on the server instead.

## Deploy the linker

Cloud Functions need the Blaze plan. From this folder, after `npx -y firebase-tools@latest login`:

```bash
gcloud projects add-iam-policy-binding studio-6322617027-3e57b \
  --member="serviceAccount:634923058356-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

npx -y firebase-tools@latest deploy --only functions:linkWithPin
```

The Token Creator role lets the function mint custom tokens. If token creation fails in the logs with `iam.serviceAccounts.signBlob`, that role is missing on the function’s runtime service account.

`firebase.json` in this repo deploys functions only. It does not deploy Hosting or Firestore rules.
