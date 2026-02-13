// Hardcoded Firebase configuration values (only API key is user-configurable)
const FIREBASE_CONFIG = {
  authDomain: "studio-6322617027-3e57b.firebaseapp.com",
  projectId: "studio-6322617027-3e57b",
  storageBucket: "studio-6322617027-3e57b.firebasestorage.app",
  messagingSenderId: "634923058356",
  appId: "1:634923058356:web:241b9a6016cb37523443e1"
};

// Firebase configuration loaded from settings
let firebaseConfig = null;
let db = null;
let firebaseInitialized = false;

/**
 * Initialize Firebase with configuration from storage
 */
async function initializeFirebase() {
  if (firebaseInitialized) {
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
  if (areaName === "sync" && changes.firebaseApiKey) {
    // Reset initialization when API key changes
    firebaseInitialized = false;
    firebaseConfig = null;
    db = null;
  }
});

/**
 * Save a text snippet to the users/{userId}/tasks collection in Firestore.
 * @param {string} text - The text to save (detail field).
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<string>} The document ID of the saved entry.
 */
async function saveTextToFirebase(text, userId) {
  if (!userId) {
    throw new Error("User ID is required. Please sign in first.");
  }

  try {
    const firestore = await initializeFirebase();
    const docRef = await firestore
      .collection("users")
      .doc(userId)
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
    throw error;
  }
}

/**
 * Fetch recent saved texts from Firestore, ordered by creation time.
 * @param {number} [limit=10] - Maximum number of entries to fetch.
 * @param {string} userId - The authenticated user's ID.
 * @returns {Promise<Array>} Array of saved text objects.
 */
async function getRecentTexts(limit = 10, userId) {
  if (!userId) {
    throw new Error("User ID is required. Please sign in first.");
  }

  try {
    const firestore = await initializeFirebase();
    const snapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching texts from Firebase:", error);
    throw error;
  }
}
