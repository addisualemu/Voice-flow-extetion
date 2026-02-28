# Firebase SDK Libraries

This folder should contain the Firebase compat JavaScript SDK files.

## Required files

1. `firebase-app-compat.js`
2. `firebase-firestore-compat.js`

## How to get them

### Option A: Download manually

Download these two files from the Firebase CDN and place them in this folder:

- https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js
- https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js

Using curl:
```bash
curl -O https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js
curl -O https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js
```

### Option B: Use the setup script

From the project root, run:
```bash
./setup.sh
```
