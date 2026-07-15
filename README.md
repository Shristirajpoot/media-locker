# Paid Media Locker System

A full-stack, highly secure, and visually polished Paid Media Locker system. Users can upload original images, specify a coin-unlock price, and monetize their content. Other users can view heavily blurred previews and purchase unlocks using their wallet balance.

Built as an intern submission for **Team Konvo**.

---

## 🏛️ System Architecture

The platform is split into two core modules:
1. **Backend**: Node.js Express server + SQLite database + secure file storage.
2. **Frontend**: React Native mobile application built on Expo SDK 57 featuring a premium dark mode theme, stacked navigation, and real-time wallet tracking.

```
┌────────────────────────────────────────────────────────┐
│               React Native Mobile App                  │
└──────────────────────────┬─────────────────────────────┘
                           │ Authenticated HTTP / Forms
                           ▼
┌────────────────────────────────────────────────────────┐
│                 Express API Server                     │
│  (Auth Check, Jimp Preview Generator, Router Logs)     │
└──────────────────────────┬─────────────────────────────┘
                           │ Write / Query
                           ▼
┌────────────────────────────────────────────────────────┐
│           SQLite Database & File System                │
│    (Media metadata, Transaction Ledger, storage/)      │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Design & Considerations

Protecting paid premium media is the core requirement of this platform. The system implements multiple defensive strategies:

### 1. Media Storage & Serve Strategy (Zero Static Serving)
* **Private Directories**: Original full-resolution uploads are saved in `storage/originals/`. This folder is **not** served statically by the Express web server (e.g. via `express.static`). Direct access to raw files is physically blocked.
* **Gated Streaming Route**: Original files are only reachable via `GET /api/media/:id/original`. When hit, the backend checks:
  1. Is the requester the original uploader (owner)?
  2. Does there exist a successful purchase record (`unlocks` table entry) for the requester and this media?
  * If either is true, the server streams the file. Otherwise, it returns `403 Forbidden`.

### 2. Irreversible Preview Blurring
* When an image is uploaded, the backend immediately loads it into memory using **Jimp (Pure JS Image Processing)**.
* The backend downscales the image to a maximum width of `350px` first, then applies a heavy **20px Gaussian blur**. 
* *Why downscale first?* Downscaling discards high-frequency pixel data permanently. Combined with a heavy blur, it makes the preview mathematically impossible to "de-blur" or reverse-engineer into the original image.

### 3. Protection against URL Sharing
* Many locker services serve original files using temporary URLs that can be leaked or shared with unauthorized peers.
* In our system, both preview and original image endpoints require a valid JWT session token sent in the `Authorization: Bearer <token>` header. If a user copies and shares the preview/original image URL, it will fail to load in any browser or external client without active JWT credentials.

### 4. Double Spend & Race Condition Prevention
* In-app purchases deduct wallet balances and transfer coins to the uploader. To prevent concurrent request manipulation (double spend exploits), all updates are wrapped inside a strict **SQLite database transaction (`BEGIN TRANSACTION` / `COMMIT`)**.
* The transaction verifies that:
  1. The user has enough coins.
  2. An unlock record does not already exist.
  * If either check fails, the transaction is immediately rolled back, ensuring wallet balances never become inconsistent.

---

## 🗄️ Database Schema

We use SQLite for database persistence. The tables are configured as follows:

### 1. `users` Table
Stores authentication and current wallet coin balance.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `username` (TEXT UNIQUE NOT NULL)
* `password_hash` (TEXT NOT NULL)
* `coins` (INTEGER DEFAULT 100) — New users start with 100 coins for testing.
* `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 2. `media` Table
Stores monetized content metadata and disk paths.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `owner_id` (INTEGER NOT NULL, FK to `users.id`)
* `title` (TEXT NOT NULL)
* `description` (TEXT)
* `price` (INTEGER NOT NULL)
* `original_path` (TEXT NOT NULL) — Path to the secure raw image.
* `preview_path` (TEXT NOT NULL) — Path to the blurred preview.
* `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 3. `unlocks` Table
A ledger of which user purchased what media.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `user_id` (INTEGER NOT NULL, FK to `users.id`)
* `media_id` (INTEGER NOT NULL, FK to `media.id`)
* `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
* *Constraint*: UNIQUE (`user_id`, `media_id`) to prevent duplicate purchases.

### 4. `transactions` Table
An audit log tracking wallet changes (income and spending).
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `user_id` (INTEGER NOT NULL, FK to `users.id`)
* `amount` (INTEGER NOT NULL) — Negative for debits, positive for credits.
* `type` (TEXT NOT NULL) — Enum: `'INITIAL'`, `'UNLOCK_SPENT'`, `'UPLOAD_EARNED'`.
* `reference_id` (INTEGER NULL, FK to `media.id`) — Associated media (if applicable).
* `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

## 🚀 Setup & Installation

### Option A: Docker Compose (Backend Only)
The backend can be built and run in a Docker container using a bind-mount volume to persist database/uploads on your host system.

1. Install Docker and Docker Compose.
2. From the root directory, build and run:
   ```bash
   docker-compose up --build
   ```
3. The API server will start on port `5000`. Database records and uploaded media will sync locally to `backend/storage/`.

---

### Option B: Local Setup (Backend + Frontend)

#### Step 1: Run the Backend
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the integration test suite to verify everything passes:
   ```bash
   npm test
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *The server runs on http://localhost:5000*

#### Step 2: Run the React Native Frontend
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Configure API Client Connection**:
   Open `src/api/client.js` and set the `BASE_URL` based on your environment:
   * **Android Emulator**: Keep default `'http://10.0.2.2:5000'`.
   * **Physical Android Device**: Change to `'http://<your-computer-ip>:5000'` (e.g. `'http://192.168.1.102:5000'`) and make sure your phone and computer are on the same Wi-Fi network.
   * **Web Browser**: Set to `'http://localhost:5000'`.
4. Start the Expo developer runner:
   ```bash
   # Start Expo development server
   npm start
   
   # Or directly run on connected Android device/emulator
   npm run android
   ```

---

## 📖 API Documentation

All routes expect header: `Content-Type: application/json`.
Protected routes require header: `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Routes

#### `POST /api/auth/register`
Creates a new account, seeds it with 100 free coins, and registers a transaction entry.
* **Request Body**:
  ```json
  { "username": "alex", "password": "password123" }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOi...",
    "user": { "id": 1, "username": "alex", "coins": 100 }
  }
  ```

#### `POST /api/auth/login`
Authenticates a user and returns a session JWT.
* **Request Body**:
  ```json
  { "username": "alex", "password": "password123" }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "user": { "id": 1, "username": "alex", "coins": 100 }
  }
  ```

#### `GET /api/auth/me` (Protected)
Gets the current user's details and real-time wallet balance.
* **Success Response (200 OK)**:
  ```json
  {
    "user": { "id": 1, "username": "alex", "coins": 100, "created_at": "..." }
  }
  ```

---

### Media Routes

#### `POST /api/media/upload` (Protected)
Uploads an image, auto-generates a blurred preview thumbnail, and locks the content.
* **Request Headers**: `Content-Type: multipart/form-data`
* **Request Body (Form Data)**:
  * `title`: "Beautiful Mountains"
  * `description`: "High-res raw capture from my hike"
  * `price`: "15" (coin cost)
  * `image`: [File Upload Binary]
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Media uploaded and processed successfully",
    "media": { "id": 4, "title": "...", "price": 15, "isLocked": false, "isOwner": true }
  }
  ```

#### `GET /api/media/feed` (Protected)
Returns a list of all uploads. The uploader status (`isOwner`) and unlock status (`isLocked`) are dynamically computed relative to the calling user.
* **Success Response (200 OK)**:
  ```json
  {
    "feed": [
      {
        "id": 1,
        "ownerId": 2,
        "ownerUsername": "bob",
        "title": "Secret Beach",
        "description": "Premium photo",
        "price": 20,
        "isLocked": true,
        "isOwner": false
      }
    ]
  }
  ```

#### `GET /api/media/:id/preview` (Protected)
Streams the blurred, downscaled image preview directly to `<Image />`.
* **Response**: Binary image stream (`image/png` or `image/jpeg`).

#### `GET /api/media/:id/original` (Protected, Security-Gated)
Streams the original clean full-resolution image.
* **Response**: Binary image stream.
* **Error (403 Forbidden)**: Returned if the requester is neither the owner nor has unlocked the media.

#### `POST /api/media/:id/unlock` (Protected)
Deducts coin price from the buyer's balance, credits the seller, creates an unlock purchase entry, and logs transactions.
* **Success Response (200 OK)**:
  ```json
  {
    "message": "Content unlocked successfully",
    "mediaId": 1,
    "price": 20,
    "remainingCoins": 80
  }
  ```

---

### Wallet Routes

#### `GET /api/wallet/transactions` (Protected)
Gets a complete audited transaction ledger for the user.
* **Success Response (200 OK)**:
  ```json
  {
    "transactions": [
      {
        "id": 5,
        "user_id": 1,
        "amount": -20,
        "type": "UNLOCK_SPENT",
        "reference_id": 1,
        "media_title": "Secret Beach",
        "created_at": "2026-07-15T12:00:00Z"
      },
      {
        "id": 1,
        "user_id": 1,
        "amount": 100,
        "type": "INITIAL",
        "reference_id": null,
        "media_title": null,
        "created_at": "2026-07-15T11:00:00Z"
      }
    ]
  }
  ```

---

## 📱 Live Demo Instructions

To demonstrate the full-stack flow, use these credentials on registration/login or create new accounts:

### Demo Scenario Setup:
1. **Register Creator**: Create an account `creator` (starts with `100` coins).
2. **Upload & Price**: Go to the upload page, pick a photo, set Title = `Sunset View` and Price = `30` coins. Tap Publish.
3. **Register Buyer**: Log out and register a new account `buyer` (starts with `100` coins).
4. **Browse Feed**: `buyer` sees `Sunset View` by `@creator` marked as **Locked** showing a heavily blurred thumbnail.
5. **Locked Check**: Tapping it shows details and locks the image from being retrieved directly.
6. **Unlock**: Tap **Unlock Content** for 30 coins. Balance drops to `70` coins.
7. **View Original**: The screen refreshes, the image unblurs (loads the high-resolution clean file stream), and displays a green "Purchased!" banner.
8. **Earnings Verification**: Log out of `buyer` and log back into `creator`. The creator's balance will now be `130` coins (100 starting + 30 earned from the unlock!).
9. **Wallet Check**: Both users can visit their respective **My Wallet** screen to view transaction items.
