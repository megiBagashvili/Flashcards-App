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
- [ ] **P0-C3-S2: Review PS1 ADTs (Card, Deck)**
- *Details:* Understand Spec, AF, RI, `checkRep`, methods, SRS logic.
- [ ] **P0-C3-S3: Identify Integration Points
- *Details:* Document card add/review flow. Decide initial `Deck` instance location (Popup scope or Background Worker).
- [ ] **P0-C3-S4: Sketch High-Level Architecture**
- *Details:* Use tool (Excalidraw) for components (Extension, Hand Pose, PS1 Core, Backend, DB) & data flow.
- [ ] **P0-C3-S5: Document Initial Decisions**
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
- [ ] **P2-C3-S6: Write Unit Tests for `GestureRecognizer`**
- *Details:* **CRITICAL:** Create `GestureRecognizer.test.ts`. Create mock landmark data for each gesture + ambiguous cases. Write tests asserting correct enum results.
- [ ] **P2-C3-S7: Run Tests and Debug**
- *Details:* Run `npm test`. Fix logic/tests until passing.
- [ ] **P2-C3-S8: Implement `checkRep()` (Optional but recommended)**
- *Details:* Add method for internal consistency checks.
- [ ] **P2-C3-S9: Git: Commit Gesture Recognizer ADT**
- *Details:* `feature/gesture-recognizer-adt` branch. Commit ADT code & tests. PR -> merge.

### P2-C4: Integrate Gestures & Review Flow

*Chunk Goal: Use recognized gestures (Easy/Wrong/Hard) to update the review status of cards in the in-memory Deck.*

- [ ] **P2-C4-S1: Add Review UI Elements**
- *Details:* `popup.html`: Add `#review-front`, `#review-back`, 'Show Answer', `#gesture-status`.
- [ ] **P2-C4-S2: Implement Card Display Logic**
- *Details:* `popup.js`: Create `displayCardForReview()`. Get card via `deck.getNextCardToReview()`. Store `currentCard`. Display front, hide back. Handle no cards due.
- [ ] **P2-C4-S3: Implement 'Show Answer' Logic**
- *Details:* Add listener to show `currentCard.back`.
- [ ] **P2-C4-S4: Instantiate and Use `GestureRecognizer` in Loop**
- *Details:* `popup.js`: Create instance. In `detectHandsLoop`, call `recognizeGesture()`. Display result in `#gesture-status`.
- [ ] **P2-C4-S5: Implement Debouncing Logic**
- *Details:* Track `lastDetectedGesture`, `gestureConfidence`. Trigger action only if `gestureConfidence >= REQUIRED_CONFIDENCE` (e.g., 3-5 frames).
- [ ] **P2-C4-S6: Implement Gesture-to-Review Mapping (Easy/Wrong/Hard)**
- *Details:* After debounce: Map `ThumbsDown->0 (Wrong)`, `FlatHand->1 (Hard)`, `ThumbsUp->2 (Easy)`. Call `deck.updateCardReview(currentCard, reviewResult)` (or message background). Log update. Reset confidence. Call `displayCardForReview()`.
- [ ] **P2-C4-S7: Test: Full Gesture Review Flow**
- *Details:* Reload ext. Add cards. Review with gestures. Verify recognition, debounce, correct card update (logs), next card display.
- [ ] **P2-C4-S8: Refine Gesture Recognition**
- *Details:* Adjust thresholds/logic in `GestureRecognizer` based on testing. Update unit tests.
- [ ] **P2-C4-S9: Git: Commit Gesture Review Feature**
- *Details:* `feature/gesture-review` branch. Commit changes. PR -> merge.

---

## Phase 3: Backend & Database Integration

**Phase Goal:** Persist card data using a Node.js/Express backend and **PostgreSQL** database.

### P3-C1: Backend Server & API Skeleton (Node/Express)
*Chunk Goal: Set up a basic Node.js/Express server with placeholder API routes.*
- [ ] **P3-C1-S1: Set up Backend Directory Structure**
- *Details:* Create `/server`. `npm init`. Install `express`, `cors`, `dotenv`. Dev install `typescript`, types, `ts-node-dev`. Create `tsconfig.json`.
- [ ] **P3-C1-S2: Create Basic Express Server (`server/src/server.ts`)**
- *Details:* Import libs. Create app. Use `cors()`. Basic GET `/`. Listen on `process.env.PORT || 3001`. Add `start:dev` script.
- [ ] **P3-C1-S3: Define Placeholder API Routes**
- *Details:* `routes/cardRoutes.ts`: Define `POST /api/cards`, `GET /api/cards`, `PUT /api/cards/:id/review`, `DELETE /api/cards/:id` placeholders. Mount router.
- [ ] **P3-C1-S4: Test: Run Server & Hit Endpoints**
- *Details:* `npm run start:dev`. Use Postman/curl. Verify placeholders.
- [ ] **P3-C1-S5: Git: Commit Backend Skeleton**

- *Details:* `feature/backend-skeleton` branch. Commit server code. PR -> merge.


### P3-C2: Database Setup & Connection (PostgreSQL)

*Chunk Goal: Set up PostgreSQL database and connect the backend server.*

- [ ] **P3-C2-S1: Install & Set Up PostgreSQL**

- *Details:* Install Postgres locally/Docker/cloud. Create DB (e.g., `srs_dev_db`), user/role.
- [ ] **P3-C2-S2: Define Database Schema (SQL)**
- *Details:* Create `schema.sql`: `CREATE TABLE cards` (id, front, back, interval, ease_factor, due_date, created_at, updated_at).
- [ ] **P3-C2-S3: Apply Schema to Database**
- *Details:* Connect to DB (`psql`/GUI). Execute `schema.sql`.
- [ ] **P3-C2-S4: Install DB Driver (`pg`)**\n    - *Details:* `/server`: `npm install pg @types/pg`.
- [ ] **P3-C2-S5: Configure Database Connection**
- *Details:* Use `dotenv`. Create `.env` (add to `.gitignore`). Store `DATABASE_URL`. Create `db.ts` using `pg.Pool`. Export pool.
- [ ] **P3-C2-S6: Test: Database Connection**
- *Details:* Import pool. Try `pool.query('SELECT NOW()')`. Verify connection.
- [ ] **P3-C2-S7: Git: Commit DB Setup**
- *Details:* `feature/db-setup` branch. Commit schema, connection logic, `.env.example`. PR -> merge.


### P3-C3: Backend API Implementation

*Chunk Goal: Implement the logic for API endpoints to interact with the PostgreSQL database.*

- [ ] **P3-C3-S1: Implement `POST /api/cards` Logic**
- *Details:* Validate body. `INSERT INTO cards ... RETURNING *`. Handle errors. Return `201`.
- [ ] **P3-C3-S2: Implement `GET /api/cards` Logic**
- *Details:* Check query params (e.g., `?due=today`). `SELECT * FROM cards` (add `WHERE due_date <= NOW()` if needed). Handle errors. Return `200`.
- [ ] **P3-C3-S3: Implement `PUT /api/cards/:id/review` Logic**
- *Details:* Validate params/body (`reviewResult: 0|1|2`). Fetch card. Implement/call SRS update logic. `UPDATE cards ... RETURNING *`. Handle errors/404. Return `200`.
- [ ] **P3-C3-S4: Implement `DELETE /api/cards/:id` Logic**
- *Details:* Validate ID. `DELETE FROM cards WHERE id = $1`. Check result. Handle errors/404. Return `204`.
- [ ] **P3-C3-S5: Implement Centralized Error Handling**
- *Details:* Add Express error middleware for consistent JSON errors.
- [ ] **P3-C3-S6: Write API Integration Tests (Jest + Supertest)**
- *Details:* **IMPORTANT:** Test each endpoint against test DB (setup/teardown). Verify status codes, responses.
- [ ] **P3-C3-S7: Test: Full API Functionality**
- *Details:* Run server. Use Postman/tests to verify CRUD ops against DB.
- [ ] **P3-C3-S8: Git: Commit Backend Implementation**
- *Details:* `feature/backend-impl` branch. Commit API logic & tests. PR -> merge.


### P3-C4: Frontend API Integration

*Chunk Goal: Refactor the browser extension to use the backend API for persistence.*

- [ ] **P3-C4-S1: Refactor Card Creation (Save Button)**
- *Details:* Modify save listener: `fetch('/api/cards', { method: 'POST', ... })`. Handle promise/response/errors. Update UI.
- [ ] **P3-C4-S2: Refactor Card Loading**
- *Details:* Modify review logic: `fetch('/api/cards?due=today')`. Store results locally for session. Handle promise/errors.
- [ ] **P3-C4-S3: Refactor Card Review Update (Gesture)**
- *Details:* Modify gesture logic: `fetch(\`/api/cards/\${id}/review\`, { method: 'PUT', ... })`. Handle promise/response/errors.
- [ ] **P3-C4-S4: Add Loading and Error States to UI**
- *Details:* Show loading indicators during `fetch`. Display user-friendly API errors.
- [ ] **P3-C4-S5: Test: End-to-End Persistent Flow**
- *Details:* Run backend. Reload ext. Test create -> persist -> review -> DB updates. Test errors.
- [ ] **P3-C4-S6: Git: Commit Frontend API Integration**
- *Details:* `feature/frontend-api-integration` branch. Commit refactored frontend. PR -> merge.

---

## Phase 4: Deployment (Optional Bonus)

**Phase Goal:** Deploy the backend and database to the cloud (AWS).

### P4-C1: Deploy Database (AWS RDS - PostgreSQL)

*Chunk Goal: Create a managed Postgres instance on AWS RDS.*

- [ ] **P4-C1-S1: Create RDS Instance**
- *Details:* Use AWS console. Launch Postgres instance (Free Tier?). Configure.
- [ ] **P4-C1-S2: Configure Security Group**
- *Details:* Allow inbound port 5432 from backend IP/SG.
- [ ] **P4-C1-S3: Apply Schema to RDS**
- *Details:* Connect to RDS. Run `schema.sql`.
- [ ] **P4-C1-S4: Update Backend Env Vars for Deployment**
- *Details:* Set `DATABASE_URL` to RDS endpoint in deployment environment.


### P4-C2: Deploy Backend (AWS Elastic Beanstalk or EC2)

*Chunk Goal: Deploy the Node.js/Express application.*

- [ ] **P4-C2-S1: Prepare Backend for Deployment**
- *Details:* Add `build` script (`tsc`). Check `start` script/Procfile.
- [ ] **P4-C2-S2: Create EB Application / Set up EC2**
- *Details:* Use AWS EB console/CLI or configure EC2 instance with Node.js.
- [ ] **P4-C2-S3: Configure Environment Variables**
- *Details:* Set `DATABASE_URL`, `PORT`, `NODE_ENV=production` in deployment config.
- [ ] **P4-C2-S4: Deploy Code**
- *Details:* Use `eb deploy` or manual deployment process. Monitor.
- [ ] **P4-C2-S5: Configure Security Groups (EB/EC2 <> RDS)**
- *Details:* Ensure backend instance SG can reach RDS SG on port 5432.
- [ ] **P4-C2-S6: Test Deployed API**
- *Details:* Use Postman/curl to hit public deployed URL endpoints.


### P4-C3: Configure Frontend for Deployed Backend

*Chunk Goal: Make the browser extension communicate with the deployed API.*

- [ ] **P4-C3-S1: Update API Base URL in Extension**
- *Details:* Change `fetch` base URL in `popup.js` (or config) to deployed backend URL.
- [ ] **P4-C3-S2: Rebuild/Reload Extension**
- *Details:* Reload unpacked extension.
- [ ] **P4-C3-S3: Test End-to-End with Deployed Backend**
- *Details:* Repeat create/review tests using deployed resources.

---


## Phase 5: Continuous Practices & Polish

**Phase Goal:** Maintain code quality, documentation, and improve UX throughout the project.

### P5-C1: Ongoing Activities

*Chunk Goal: Integrate best practices into daily workflow.*


- [ ] **P5-C1-S1: Write Tests Concurrently**
- *Details:* Add Unit/Integration tests alongside features.
- [ ] **P5-C1-S2: Maintain Documentation**
- *Details:* Update README, Spec/AF/RI comments as code changes.
- [ ] **P5-C1-S3: Adhere to Git Workflow**
- *Details:* Consistent use of branches, commits, PRs, reviews.
- [ ] **P5-C1-S4: Refactor Regularly**
- *Details:* Identify & improve code quality (ETU, RFC).
- [ ] **P5-C1-S5: Enhance Error Handling**
- *Details:* Improve robustness and user feedback for errors (SFB).
- [ ] **P5-C1-S6: Improve UX/UI**
- *Details:* Refine layout, feedback, transitions based on usage.
- [ ] **P5-C1-S7: Final Testing & Bug Fixing**
- *Details:* Comprehensive testing across features and browsers before submission.

---

## Phase 6: Documentation & Submission

**Phase Goal:** Prepare final deliverables, documentation, and submit project.

### P6-C1: Project Documentation
*Chunk Goal: Ensure the codebase is well-documented and understandable.*
- [ ] **P6-C1-S1: Update README.md**
- *Details:* Final usage guide, architecture, features, setup, demo link.
- [ ] **P6-C1-S2: Add Final Code Comments**
- *Details:* Ensure clarity in complex sections.
- [ ] **P6-C1-S3: Create Demo Walkthrough (Video/GIFs)**
- *Details:* Showcase key features and usage.
- [ ] **P6-C1-S4: License and Credits**
- *Details:* Add MIT license. List contributors.
- [ ] **P6-C1-S5: Git: Final Commit & Tag**
- *Details:* Tag final release (e.g., `v1.0.0`). Ensure `main` branch is clean.
### P6-C2: Submission\n*Chunk Goal: Deliver project according to requirements.*
- [ ] **P6-C2-S1: Confirm Submission Requirements**
- *Details:* Check checklist/instructions for repo link, video, report, etc.
- [ ] **P6-C2-S2: Submit Project**
- *Details:* Upload/submit via required platform.
- [ ] **P6-C2-S3: Celebrate!**
- *Details:* Project complete!