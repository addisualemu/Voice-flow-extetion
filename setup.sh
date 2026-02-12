#!/bin/bash
# Setup script: downloads the Firebase SDK files needed by the extension.

set -e

FIREBASE_VERSION="10.12.2"
LIBS_DIR="$(dirname "$0")/libs"

echo "Downloading Firebase SDK v${FIREBASE_VERSION}..."

curl -sL "https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js" \
  -o "${LIBS_DIR}/firebase-app-compat.js"
echo "  -> firebase-app-compat.js downloaded."

curl -sL "https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore-compat.js" \
  -o "${LIBS_DIR}/firebase-firestore-compat.js"
echo "  -> firebase-firestore-compat.js downloaded."

echo ""
echo "Done! Firebase SDK files are ready in ${LIBS_DIR}/"
echo ""
echo "Next steps:"
echo "  1. Edit firebase-config.js and background.js with your Firebase project credentials."
echo "  2. Load the extension in Chrome: chrome://extensions -> Load unpacked -> select this folder."
