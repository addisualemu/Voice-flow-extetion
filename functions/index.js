const { onRequest } = require("firebase-functions/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");

initializeApp();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 5;
const MAX_ATTEMPTS_PER_PIN = 10;
const ATTEMPT_PEPPER = "voice-flow-pin-link-v1";

function applyCors(req, res) {
  const origin = req.get("origin") || "";
  if (origin.startsWith("chrome-extension://")) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  res.set("Cache-Control", "no-store");
}

function sendError(res, status, error) {
  res.status(status).json({ error });
}

function clientIp(req) {
  // Cloud Run appends the connecting IP. A caller can put fake values
  // in front of it, so the last entry is the one the platform added.
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) {
      return parts[parts.length - 1];
    }
  }
  return req.ip || "unknown";
}

function attemptId(kind, value) {
  return crypto
    .createHash("sha256")
    .update(`${ATTEMPT_PEPPER}:${kind}:${value}`)
    .digest("hex");
}

function readPin(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      body = {};
    }
  }
  if (!body || typeof body.pin !== "string") {
    return "";
  }
  return body.pin.replace(/\s+/g, "");
}

// Counts this attempt and returns false when the caller is over the limit.
// The transaction stops a burst of parallel guesses from slipping past the cap.
async function consumeAttempt(db, docId, max) {
  const ref = db.collection("pinLinkAttempts").doc(docId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    let count = 0;
    let windowStart = now;
    if (snap.exists) {
      const data = snap.data() || {};
      const start = data.windowStart && data.windowStart.toMillis ? data.windowStart.toMillis() : 0;
      if (now - start < WINDOW_MS) {
        count = data.count || 0;
        windowStart = start;
      }
    }
    if (count >= max) {
      return false;
    }
    tx.set(ref, {
      count: count + 1,
      windowStart: Timestamp.fromMillis(windowStart)
    });
    return true;
  });
}

async function findPin(db, pin) {
  const primary = await db.collection("linkingPins").doc(pin).get();
  if (primary.exists) {
    return primary;
  }
  const upper = pin.toUpperCase();
  if (upper !== pin) {
    const alternate = await db.collection("linkingPins").doc(upper).get();
    if (alternate.exists) {
      return alternate;
    }
  }
  return null;
}

// Exchanges a connection PIN for a Firebase custom token.
// Clients cannot read linkingPins. This function uses the Admin SDK.
// pinLinkAttempts has no client rule, so Firestore denies client access.
exports.linkWithPin = onRequest(
  {
    region: "us-central1",
    invoker: "public",
    cors: false,
    maxInstances: 5,
    timeoutSeconds: 15,
    memory: "256MiB"
  },
  async (req, res) => {
    applyCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      sendError(res, 405, "Use POST.");
      return;
    }

    const db = getFirestore();
    const ipKey = attemptId("ip", clientIp(req));
    const pin = readPin(req);
    const pinKey = pin ? attemptId("pin", pin.toUpperCase()) : "";

    try {
      if (!(await consumeAttempt(db, ipKey, MAX_ATTEMPTS_PER_IP))) {
        sendError(res, 429, "Too many attempts. Wait a few minutes and try again.");
        return;
      }

      if (!/^[A-Za-z0-9]{4,16}$/.test(pin)) {
        sendError(res, 400, "Enter the PIN shown in Voice Flow.");
        return;
      }

      if (!(await consumeAttempt(db, pinKey, MAX_ATTEMPTS_PER_PIN))) {
        sendError(res, 429, "Too many attempts. Wait a few minutes and try again.");
        return;
      }

      const snap = await findPin(db, pin);
      const userId = snap && snap.exists ? snap.get("userId") : "";
      if (typeof userId !== "string" || userId.length < 8 || userId.length > 128) {
        sendError(res, 401, "That PIN is not valid.");
        return;
      }

      try {
        await getAuth().getUser(userId);
      } catch (error) {
        sendError(res, 401, "That PIN is not valid.");
        return;
      }

      const token = await getAuth().createCustomToken(userId);
      res.status(200).json({ token });
    } catch (error) {
      console.error("linkWithPin failed", error && error.message);
      sendError(res, 500, "Could not connect right now. Try again.");
    }
  }
);
