// Firebase configuration
// Replace these values with your own Firebase project config.
// You can find them in the Firebase Console → Project Settings → General → Your apps.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

/**
 * Save a text snippet to the "savedTexts" collection in Firestore.
 * @param {string} text - The text to save.
 * @param {string} source - Where the text came from ("manual" or "selection").
 * @param {string} [pageUrl] - The URL of the page (for selected text).
 * @returns {Promise<string>} The document ID of the saved entry.
 */
async function saveTextToFirebase(text, source, pageUrl = "") {
  try {
    const docRef = await db.collection("savedTexts").add({
      text: text,
      source: source,
      pageUrl: pageUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
 * @returns {Promise<Array>} Array of saved text objects.
 */
async function getRecentTexts(limit = 10) {
  try {
    const snapshot = await db
      .collection("savedTexts")
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
