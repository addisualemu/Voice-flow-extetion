// Same public client config as the Voice Flow web app.
// The API key identifies the Firebase project. It is not a user secret.
// Firestore rules and Firebase Auth decide what a caller can do.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB_0R7hubnIc_wfnyOVBDhPLG6QRbEXu54",
  authDomain: "studio-6322617027-3e57b.firebaseapp.com",
  projectId: "studio-6322617027-3e57b",
  storageBucket: "studio-6322617027-3e57b.firebasestorage.app",
  messagingSenderId: "634923058356",
  appId: "1:634923058356:web:241b9a6016cb37523443e1"
};

const LINK_PIN_URL = "https://us-central1-studio-6322617027-3e57b.cloudfunctions.net/linkWithPin";

function initializeFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  return firebase.firestore();
}

function waitForSignedInUser() {
  initializeFirebase();
  const auth = firebase.auth();
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Exchange a Voice Flow connection PIN for a Firebase Auth session.
 * The PIN is sent to Cloud Function linkWithPin, which reads linkingPins
 * with the Admin SDK and returns a custom token. The PIN is not stored.
 * @param {string} pin
 * @returns {Promise<firebase.User>}
 */
async function connectWithPin(pin) {
  const normalized = String(pin || "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9]{4,16}$/.test(normalized)) {
    throw new Error("Enter the connection PIN from Voice Flow.");
  }

  initializeFirebase();
  await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  let response;
  try {
    response = await fetch(LINK_PIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: normalized })
    });
  } catch (error) {
    throw new Error("Could not reach Voice Flow. Check your connection and try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 404) {
    throw new Error("Connection service is not available yet.");
  }
  if (!response.ok || !data.token) {
    throw new Error(data.error || "Could not connect with that PIN.");
  }

  const credential = await firebase.auth().signInWithCustomToken(data.token);
  try {
    await chrome.storage.sync.remove(["firebaseApiKey", "userId"]);
  } catch (error) {
    // Older installs stored these. Signing in does not depend on deleting them.
  }
  return credential.user;
}

async function disconnectAccount() {
  initializeFirebase();
  await firebase.auth().signOut();
}

/**
 * Save a text snippet to users/{uid}/tasks for the signed-in user.
 * @param {string} text
 * @returns {Promise<string>} The new task document id.
 */
async function saveTextToFirebase(text) {
  const user = await waitForSignedInUser();
  if (!user) {
    throw new Error("Not connected. Enter your connection PIN in settings.");
  }

  try {
    const firestore = initializeFirebase();
    const docRef = await firestore
      .collection("users")
      .doc(user.uid)
      .collection("tasks")
      .add({
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        detail: text,
        stage: "Entry"
      });
    return docRef.id;
  } catch (error) {
    console.error("Error saving text to Firebase:", error);
    if (error.code === "permission-denied") {
      throw new Error("Firestore rejected the save. Connect again from settings.");
    }
    throw error;
  }
}
