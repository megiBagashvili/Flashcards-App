# Midterm Project to-do

---
## Phase 0: Setup, Planning & Foundation
**Phase Goal:** Establish team, environment, repository, and understand PS1 baseline.
### P0-C1: Team & Environment Setup
*Chunk Goal: Ensure all developers have the necessary tools and communication channels.*
- [x] **P0-C1-S1: Finalize Team & Roles**   
- *Details:* Confirm members. Assign initial focus areas (flexible).
- [x] **P0-C1-S2: Establish Communication Channels** 
- *Details:* Set up Slack/Discord. Define meeting schedule.
- [x] **P0-C1-S3: Install Required Software**  
- *Details:* Verify Node.js, npm/yarn, TypeScript (`npm install -g typescript`), Git installations.
- [x] **P0-C1-S4: Set Up Code Editor**   
- *Details:* Standardize on VS Code. Install Prettier, ESLint, GitLens.

### P0-C2: Repository & Git Workflow Setup
*Chunk Goal: Create the central code repository and establish branching/commit practices.*
- [x] **P0-C2-S1: Create Central Git Repository**
- *Details:* Create on GitHub/GitLab. Add `.gitignore`, basic `package.json`.
- [x] **P0-C2-S2: Define & Practice Branching Strategy**
- *Details:* Strategy: `main` (stable), `develop` (integration), `feature/<name>`. Create `develop` branch.
- [x] **P0-C2-S3: Initialize Project & First Commit**
- *Details:* Clone. `npm init`. Add configs (`tsconfig.json`, `.prettierrc`, `.eslintrc.js`). Commit via `feature/initial-setup` -> PR -> merge/
### P0-C3: PS1 Analysis & Initial Design
*Chunk Goal: Understand the existing PS1 code and sketch the high-level architecture.*
- [x] **P0-C3-S1: Obtain and Analyze PS1 Code**
- *Details:* Integrate relevant PS1 source code (`Card`, `Deck`).
- [x] **P0-C3-S2: Review PS1 ADTs (Card, Deck)**
- *Details:* Understand Spec, AF, RI, `checkRep`, methods, SRS logic.
- [x] **P0-C3-S3: Identify Integration Points
- *Details:* Document card add/review flow. Decide initial `Deck` instance location (Popup scope or Background Worker).
- [x] **P0-C3-S4: Sketch High-Level Architecture**
- *Details:* Use tool (Excalidraw) for components (Extension, Hand Pose, PS1 Core, Backend, DB) & data flow.
- [x] **P0-C3-S5: Document Initial Decisions**
- *Details:* Update `README.md`/design doc with architecture, PS1 notes, tech choices.

---

## Phase 1: Browser Extension - Card Creation (In-Memory)

**Phase Goal:** Build the basic extension to capture text and save cards to an in-memory Deck.


### P1-C1: Extension Manifest & Basic Structure
*Chunk Goal: Create the core files and manifest for a loadable extension.*
- [x] **P1-C1-S1: Create `manifest.json` (Spec First)**
- *Details:* `manifest_version: 3`, `name`, `version`, `description`. `action.default_popup: \"popup.html\"`. Permissions: `[\"activeTab\", \"scripting\"]`. (Add `storage` later if needed before Phase 3).
- [x] **P1-C1-S2: Create Basic `popup.html`**
- *Details:* Minimal HTML file. Link `popup.js` (`<script src=\"popup.js\" defer>`).
- [x] **P1-C1-S3: Create Empty `popup.js` and `content.js`**
- *Details:* Placeholder JS files.
- [x] **P1-C1-S4: Define Content Script in Manifest**
- *Details:* Add `content_scripts` section (`matches`, `js: [\"content.js\"]`).
- [x] **P1-C1-S5: Test: Load Unpacked Extension**
- *Details:* Load in browser dev mode. Verify icon, popup, no manifest errors.
- [x] **P1-C1-S6: Git: Commit Skeleton**
- *Details:* `feature/extension-skeleton` branch. Commit files. PR -> merge.


### P1-C2: Text Capture (Content Script -> Popup)
*Chunk Goal: Implement the mechanism to get selected text from the page into the popup.*

- [x] **P1-C2-S1: Implement Content Script Listener**
- *Details:* `content.js`: `chrome.runtime.onMessage` listener for `'GET_SELECTED_TEXT'`. Use `document.getSelection().toString()` & `sendResponse`.
- [x] **P1-C2-S2: Implement Popup Text Request**
- *Details:* `popup.js` (on open): `chrome.tabs.query` + `chrome.tabs.sendMessage`.
- [x] **P1-C2-S3: Implement Popup Response Handling**
- *Details:* `popup.js`: Handle `sendMessage` response, check errors, log text.
- [x] **P1-C2-S4: Update Popup HTML**
- *Details:* Add `<textarea id=\"card-front\">`.
- [x] **P1-C2-S5: Display Text in Popup**
- *Details:* `popup.js`: Populate `#card-front` from response.
- [x] **P1-C2-S6: Test: Text Capture Flow**
- *Details:* Reload ext. Select text -> open popup -> verify text. Test no selection. Check consoles.
- [x] **P1-C2-S7: Git: Commit Text Capture Feature**
- *Details:* `feature/text-capture` branch. Commit changes. PR -> merge.


### P1-C3: In-Memory Card Save

*Chunk Goal: Integrate PS1 ADTs and save created cards to an in-memory Deck.*

- [x] **P1-C3-S1: Integrate PS1 ADTs**
- *Details:* Integrate PS1 `Card.ts`, `Deck.ts` into project. Ensure usable.
- [x] **P1-C3-S2: Instantiate Deck (In Popup or Background)**
- *Details:* Import `Deck`. Create instance (`const deck = new Deck();`). Decide scope (Popup simpler start, Background better state). Document choice.
- [x] **P1-C3-S3: Add Save UI Elements**
- *Details:* `popup.html`: Add `#card-back`, `#save-card`, `#status-message`.
- [x] **P1-C3-S4: Implement Save Button Logic**
- *Details:* Listener for `#save-card`. Get text, validate, create `new Card()`, call `deck.addCard()` (or send message if Deck in Background). Log size, provide UI feedback.
- [x] **P1-C3-S5: Test: Card Saving Flow**
- *Details:* Reload ext. Capture text, fill back, save. Check logs/state. Test validation.
- [ ] **P1-C3-S6: Refactor (If needed): Move Deck to Background Worker**
- *Details:* Implement background script, message passing if chosen in P1-C3-S2.
- [x] **P1-C3-S7: Git: Commit In-Memory Save Feature**
- *Details:* `feature/in-Memory-Card-Save` branch. Commit changes. PR -> merge.

---

## Phase 2: Hand Pose Integration (In-Memory)

**Phase Goal:** Implement webcam-based gesture control (Thumbs Up/Down/Flat Hand) for reviewing cards (Easy/Wrong/Hard) from the in-memory Deck.

### P2-C1: Webcam & TensorFlow.js Setup
*Chunk Goal: Access webcam and load the hand pose detection model.*
- [x] **P2-C1-S1: Add Dependencies**
- *Details:* `npm install @tensorflow/tfjs @tensorflow-models/hand-pose-detection`.
- [x] **P2-C1-S2: Add Video Element & Status UI**
- *Details:* `popup.html`: Add `<video id=\"webcam-feed\">`, status element `<p id=\"tf-status\">`.
- [x] **P2-C1-S3: Implement Webcam Access**
- *Details:* `popup.ts`: Create `setupWebcam()` using `navigator.mediaDevices.getUserMedia`. Handle success/failure/permissions.
- [x] **P2-C1-S4: Implement Model Loading**
- *Details:* `popup.ts`: Create `loadHandPoseModel()` using `handPoseDetection.createDetector`. Handle async load/errors. Update status UI.
- [x] **P2-C1-S5: Orchestrate Setup**
- *Details:* `popup.ts`: Call setup functions on init. Store model/video refs.
- [x] **P2-C1-S6: Test: Webcam and Model Load**
- *Details:* Reload ext. Verify permission, video feed, status messages.
- [x] **P2-C1-S7: Git: Commit TF.js Setup**
- *Details:* `feature/tfjs-setup` branch. Commit changes. PR -> merge.


### P2-C2: Hand Detection Loop\n*Chunk Goal: Continuously detect hand landmarks from the video feed.*

- [x] **P2-C2-S1: Implement Detection Loop Function**
- *Details:* `popup.js`: Create `async detectHandsLoop(model, video)`. Call `model.estimateHands()`. Log landmarks. Schedule next frame via `requestAnimationFrame`.
- [x] **P2-C2-S2: Start the Loop**
- *Details:* After setup succeeds (P2-C1), call `detectHandsLoop()` once.
- [x] **P2-C2-S3: Test: Landmark Detection**
- *Details:* Reload ext. Check popup console for landmark data logging.
- [x] **P2-C2-S4: Git: Commit Detection Loop**
- *Details:* `feature/detection-loop` branch. Commit changes. PR -> merge.

### P2-C3: Gesture Recognizer ADT

*Chunk Goal: Create and *test* the logic to translate landmarks into specific gestures (Thumbs Up/Down/Flat Hand).*

- [x] **P2-C3-S1: Create `GestureRecognizer.ts`**
- *Details:* Create file (e.g., `src/srs/GestureRecognizer.ts`).
- [x] **P2-C3-S2: Define Types and Enum**
- *Details:* Define `enum Gesture { ThumbsUp, ThumbsDown, FlatHand, Unknown }`. Define `Keypoint` type.
- [x] **P2-C3-S3: Write Spec, AF, RI for `GestureRecognizer` Class**
- *Details:* Add comments specifying `recognizeGesture` method. Detail geometric conditions for Thumbs Up/Down/Flat Hand based on landmarks. Define AF/RI.
- [x] **P2-C3-S4: Implement `recognizeGesture` Logic**
- *Details:* Write TS code comparing landmark coordinates based on spec.
- [x] **P2-C3-S5: Set up Unit Testing (Jest)**
- *Details:* Install Jest, types, ts-jest. Configure `jest.config.js`. Add test script.
- [x] **P2-C3-S6: Write Unit Tests for `GestureRecognizer`**
- *Details:* **CRITICAL:** Create `GestureRecognizer.test.ts`. Create mock landmark data for each gesture + ambiguous cases. Write tests asserting correct enum results.
- [x] **P2-C3-S7: Run Tests and Debug**
- *Details:* Run `npm test`. Fix logic/tests until passing.
- [x] **P2-C3-S8: Implement `checkRep()` (Optional but recommended)**
- *Details:* Add method for internal consistency checks.
- [x] *P2-C3-S9: Git: Commit Gesture Recognizer ADT**
- *Details:* `feature/gesture-recognizer-adt` branch. Commit ADT code & tests. PR -> merge.

### P2-C4: Integrate Gestures & Review Flow

*Chunk Goal: Use recognized gestures (Easy/Wrong/Hard) to update the review status of cards in the in-memory Deck.*

- [x] **P2-C4-S1: Add Review UI Elements**
- *Details:* `popup.html`: Add `#review-front`, `#review-back`, 'Show Answer', `#gesture-status`.
- [x] **P2-C4-S2: Implement Card Display Logic**
- *Details:* `popup.js`: Create `displayCardForReview()`. Get card via `deck.getNextCardToReview()`. Store `currentCard`. Display front, hide back. Handle no cards due.
- [x] **P2-C4-S3: Implement 'Show Answer' Logic**
- *Details:* Add listener to show `currentCard.back`.
- [x] **P2-C4-S4: Instantiate and Use `GestureRecognizer` in Loop**
- *Details:* `popup.js`: Create instance. In `detectHandsLoop`, call `recognizeGesture()`. Display result in `#gesture-status`.
- [x] **P2-C4-S5: Implement Debouncing Logic**
- *Details:* Track `lastDetectedGesture`, `gestureConfidence`. Trigger action only if `gestureConfidence >= REQUIRED_CONFIDENCE` (e.g., 3-5 frames).
- [x] **P2-C4-S6: Implement Gesture-to-Review Mapping (Easy/Wrong/Hard)**
- *Details:* After debounce: Map `ThumbsDown->0 (Wrong)`, `FlatHand->1 (Hard)`, `ThumbsUp->2 (Easy)`. Call `deck.updateCardReview(currentCard, reviewResult)` (or message background). Log update. Reset confidence. Call `displayCardForReview()`.
- [x] **P2-C4-S7: Test: Full Gesture Review Flow**
- *Details:* Reload ext. Add cards. Review with gestures. Verify recognition, debounce, correct card update (logs), next card display.
- [x] **P2-C4-S8: Refine Gesture Recognition**
- *Details:* Adjust thresholds/logic in `GestureRecognizer` based on testing. Update unit tests.
- [x] **P2-C4-S9: Git: Commit Gesture Review Feature**
- *Details:* `feature/gesture-review` branch. Commit changes. PR -> merge.

---

## Phase 3: Backend & Database Integration (Revised Plan)

**Phase Goal:** Persist card data using the existing Node.js/Express backend (`/backend` directory) and a **PostgreSQL** database.

---

### P3-C1: Backend Server & API Skeleton (Node/Express)
*Chunk Goal: Enhance the existing basic Node.js/Express server in `/backend` with placeholder API routes matching frontend expectations.*
- [x] **P3-C1-S1: Verify Backend Dependencies & Install Missing**
  - *Details:* Confirm `express`, `cors`, `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node-dev` are installed in `backend/package.json`. **Install `dotenv`**: `cd backend && npm install dotenv`.
- [x] **P3-C1-S2: Enhance Basic Express Server (`backend/src/server.ts`)**
  - *Details:* Ensure `backend/src/server.ts` imports `express`, `cors`, `dotenv`. Configure `dotenv`. Create Express app instance (`const app = express();`). Apply `cors()` middleware. Add `express.json()` middleware to parse request bodies. Ensure a basic GET `/` route exists. Make sure the server listens on `process.env.PORT || 3001`. Verify the `dev` script in `package.json` (`"dev": "ts-node-dev --respawn --transpile-only src/server.ts"`) works.
- [x] **P3-C1-S3: Define Placeholder API Routes (Matching Frontend)**
  - *Details:* Create a router file (e.g., `backend/src/routes/apiRoutes.ts`). Define placeholder handler functions for routes expected by `frontend/src/services/api.ts`: `GET /api/practice`, `POST /api/update`, `GET /api/hint`, `GET /api/progress`, `POST /api/day/next`. Mount this router in `server.ts` (e.g., `app.use('/api', apiRouter);`). Handlers should initially just log the request and send back a simple success/placeholder response. Add placeholder `POST /api/cards` for extension.
- [x] **P3-C1-S4: Test: Run Server & Hit Endpoints**
  - *Details:* Run `npm run dev` from the `backend` directory. Use Postman or `curl` to send requests to `http://localhost:3001/api/practice`, `http://localhost:3001/api/update` (with dummy data), etc. Verify the placeholder responses and console logs.
- [x] **P3-C1-S5: Git: Commit Backend Skeleton**
  - *Details:* Create `feature/backend-skeleton` branch (or similar). Commit the updated `server.ts`, new router file, and `package.json` changes. PR -> merge.

---

### P3-C2: Database Setup & Connection (PostgreSQL)
*Chunk Goal: Set up PostgreSQL database and connect the backend server.*
- [x] **P3-C2-S1: Install & Set Up PostgreSQL**
  - *Details:* Install Postgres locally/Docker/cloud. Create DB (e.g., `flashcards_db`), user/role. Note down connection details (host, port, user, password, database name).
- [x] **P3-C2-S2: Define Database Schema (SQL)**
  - *Details:* Create `backend/schema.sql`: `CREATE TABLE cards` (e.g., `id SERIAL PRIMARY KEY`, `front TEXT NOT NULL`, `back TEXT NOT NULL`, `hint TEXT`, `tags TEXT[]`, `interval INTEGER DEFAULT 0`, `ease_factor REAL DEFAULT 2.5`, `due_date TIMESTAMPTZ DEFAULT NOW()`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`). Define necessary columns for SRS if using `algorithm.ts` logic.
- [x] **P3-C2-S3: Apply Schema to Database**
  - *Details:* Connect to your created DB (`psql` or a GUI tool). Execute the commands in `schema.sql`.
- [x] **P3-C2-S4: Install DB Driver (`pg`)**
  - *Details:* Navigate to the `backend` directory: `npm install pg @types/pg`.
- [x] **P3-C2-S5: Configure Database Connection**
  - *Details:* Use `dotenv`. Create `.env` file in the `backend` directory (ensure it's in `backend/.gitignore`). Store connection details, potentially as a `DATABASE_URL` string or individual variables (`PGHOST`, `PGUSER`, etc.). Create `backend/src/db.ts` to initialize and export a `pg.Pool` instance using the environment variables.
- [x] **P3-C2-S6: Test: Database Connection**
  - *Details:* In `server.ts` or a temporary test script, import the pool from `db.ts`. Try `pool.query('SELECT NOW()')` on server start or in a test route. Verify it connects without errors.
- [x] **P3-C2-S7: Git: Commit DB Setup**
  - *Details:* Create `feature/db-setup` branch. Commit `schema.sql`, `db.ts`, `.env.example` (a template for `.env` without real credentials), relevant `package.json` changes. PR -> merge.

---

### P3-C3: Backend API Implementation
*Chunk Goal: Implement the logic for API endpoints to interact with the PostgreSQL database, using the routes expected by the frontend.*
- [x] **P3-C3-S1: Implement `GET /api/practice` Logic**
  - *Details:* In `apiRoutes.ts`, replace placeholder. Use `db.ts` pool. Query `SELECT * FROM cards WHERE due_date <= NOW() ORDER BY random() LIMIT X` (or similar logic based on `algorithm.ts`). Format response like `{ cards: [...], day: ... }`. Handle DB errors. Return `200` with data or appropriate error status. *(May need to manage/fetch `currentDay` from `state.ts` or DB)*.
- [x] **P3-C3-S2: Implement `POST /api/update` Logic**
  - *Details:* In `apiRoutes.ts`, replace placeholder. Validate request body (`cardFront`, `cardBack`, `difficulty`). Fetch the corresponding card `id` from the DB based on front/back (or assume frontend sends ID later). Use `algorithm.ts`'s `update` logic (or similar SRS calculation) to determine new `interval`, `ease_factor`, `due_date`. Execute `UPDATE cards SET ... WHERE id = $1`. Handle errors/404. Return `200` or `204`.
- [x] **P3-C3-S3: Implement `GET /api/hint` Logic**
  - *Details:* In `apiRoutes.ts`, replace placeholder. Get `cardFront`, `cardBack` from query params. Fetch card from DB. Use `algorithm.ts`'s `getHint` function. Return `200` with `{ hint: ... }`. Handle errors/404.
- [x] **P3-C3-S4: Implement `GET /api/progress` Logic**
  - *Details:* In `apiRoutes.ts`, replace placeholder. Fetch necessary data from DB (e.g., card counts per bucket, potentially review history if stored). Use `algorithm.ts`'s `computeProgress` (or equivalent DB queries). Return `200` with stats object. Handle errors.
- [x] **P3-C3-S5: Implement `POST /api/day/next` Logic**
  - *Details:* In `apiRoutes.ts`, replace placeholder. Update the concept of the current day (maybe stored in DB or simple counter). Return `200` with `{ currentDay: ... }`.
- [x] **P3-C3-S6: Implement Card Creation Endpoint (For Extension)**
  - *Details:* Add a `POST /api/cards` route to `apiRoutes.ts` to handle new card creation from the extension. Validate body (`front`, `back`, `hint`, `tags`). `INSERT INTO cards ... RETURNING *`. Handle errors. Return `201`.
- [x] **P3-C3-S7: Implement Centralized Error Handling**
  - *Details:* Add Express error-handling middleware in `server.ts` for consistent JSON error responses.
- [x] **P3-C3-S8: Write API Integration Tests (Jest + Supertest)**
  - *Details:* **IMPORTANT:** Install `supertest`, `@types/supertest`. Create test files (e.g., `backend/src/routes/api.test.ts`). Set up a separate test database or use transactions. Test each endpoint: send requests, verify status codes, check response bodies, verify database state changes.
- [x] **P3-C3-S9: Test: Full API Functionality**
  - *Details:* Run server (`npm run dev`). Use Postman/curl/tests to verify all implemented endpoints work correctly against the development database.
- [x] **P3-C3-S10: Git: Commit Backend Implementation**
  - *Details:* Create `feature/backend-impl` branch. Commit API logic & tests. PR -> merge.

---

### P3-C4: Extension API Integration
*Chunk Goal: Refactor the **browser extension (`extension/src/popup.ts`)** to use the backend API for persistence, replacing the in-memory `Deck`.*
- [x] **P3-C4-S1: Refactor Card Creation (Save Button)**
  - *Details:* Modify `handleSaveCardClick` in `extension/src/popup.ts`. Remove `deck.addCard()`. Add `fetch('http://localhost:3001/api/cards', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ front, back, hint, tags }) })`. Handle the promise response (success/error) and update the `#status-message` UI.
- [x] **P3-C4-S2: Refactor Card Loading for Review**
  - *Details:* Modify `displayCardForReview` in `extension/src/popup.ts`. Remove `deck.getNextCardToReview()`. Add `fetch('http://localhost:3001/api/practice')`. Process the response (`{ cards: [...], day: ... }`). Store the fetched `cards` array locally within `popup.ts` for the current session. Display the first card from the fetched array. Handle empty array response. Handle fetch errors.
- [x] **P3-C4-S3: Refactor Card Review Update (Gesture)**
  - *Details:* Modify `detectHandsLoop` in `extension/src/popup.ts`. Remove `deck.updateCardReview()` and `deck.removeCard()`. When a confident gesture is detected and mapped to `reviewResult`, get the `id` of the `currentCard` (assuming the API returns IDs). Add `fetch(\`http://localhost:3001/api/update\`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ cardId: currentCard.id, difficulty: reviewResult }) })` (or match the exact expected body for `/api/update`). Handle promise/response/errors. Call `displayCardForReview` (which should now display the *next* card from the *locally stored fetched array*) on success.
- [x] **P3-C4-S4: Add Loading and Error States to UI**
  - *Details:* In `popup.ts`, update `#tf-status` or other elements to show "Loading card...", "Saving card...", "Error connecting to server..." during `fetch` operations. Display user-friendly errors based on API responses.
- [x] **P3-C4-S5: Test: End-to-End Persistent Flow**
  - *Details:* Run the backend server (`cd backend && npm run dev`). Reload the extension.
    1.  Add cards using the popup -> Verify they appear in the PostgreSQL database.
    2.  Close and reopen the popup -> Verify the review section fetches and displays a card from the database (via the `/api/practice` call).
    3.  Review cards using gestures -> Verify the `POST /api/update` calls are logged by the backend and the database `due_date` (or other SRS fields) are updated correctly.
    4.  Test error handling (e.g., stop the backend server and see if the extension shows connection errors).
- [x] **P3-C4-S6: Git: Commit Extension API Integration**
  - *Details:* Create `feature/extension-api-integration` branch. Commit refactored `extension/src/popup.ts`. PR -> merge.

---


## Phase 4: Continuous Practices & Polish
**Phase Goal:** Maintain code quality, documentation, and improve UX throughout the project.
### P4-C1: Ongoing Activities
*Chunk Goal: Integrate best practices into daily workflow.*
- [x] **P4-C1-S1: Write Tests Concurrently**
- *Details:* Add Unit/Integration tests alongside features.
- [x] **P4-C1-S2: Maintain Documentation**
- *Details:* Update README, Spec/AF/RI comments as code changes.
- [x] **P4-C1-S3: Adhere to Git Workflow**
- *Details:* Consistent use of branches, commits, PRs, reviews.
- [x] **P4-C1-S4: Refactor Regularly**
- *Details:* Identify & improve code quality (ETU, RFC).
- [x] **P4-C1-S5: Enhance Error Handling**
- *Details:* Improve robustness and user feedback for errors (SFB).
- [x] **P4-C1-S6: Improve UX/UI**
- *Details:* Refine layout, feedback, transitions based on usage.
- [x] **P4-C1-S7: Final Testing & Bug Fixing**
- *Details:* Comprehensive testing across features and browsers before submission.

---

## Phase 5: Documentation & Submission

**Phase Goal:** Prepare final deliverables, documentation, and submit project.

### P5-C1: Project Documentation
*Chunk Goal: Ensure the codebase is well-documented and understandable.*
- [ ] **P5-C1-S1: Update README.md**
- *Details:* Final usage guide, architecture, features, setup, demo link.
- [ ] **P5-C1-S2: Add Final Code Comments**
- *Details:* Ensure clarity in complex sections.
- [ ] **P5-C1-S3: License and Credits**
- *Details:* Add MIT license. List contributors.
- [ ] **P5-C1-S4: Git: Final Commit & Tag**
- *Details:* Tag final release (e.g., `v1.0.0`). Ensure `main` branch is clean.
### P5-C2: Submission\n*Chunk Goal: Deliver project according to requirements.*
- [ ] **P5-C2-S1: Confirm Submission Requirements**
- *Details:* Check checklist/instructions for repo link, video, report, etc.
- [ ] **P-C2-S3: Celebrate!**
- *Details:* Project complete!