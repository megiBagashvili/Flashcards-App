Flashcard Application Specification

1. Overview

This document specifies the design and functionality of the Flashcard Application, which is a web-based tool designed to aid learning and memorization. The application allows users to practice flashcards, receive feedback on their performance, get hints, and track their learning progress over simulated days. It consists of a React frontend for user interaction and a Node.js/Express backend to manage the learning algorithm, card state, and practice history.

2. Goals

* Provide an effective learning tool based on spaced repetition principles.
* Offer a simple and intuitive user interface for practicing flashcards.
* Implement the specific Modified-Leitner algorithm as defined.
* Allow users to track their learning progress statistically.
* Maintain a clear separation between frontend presentation and backend logic/state.

3. Target Users

The application is intended for individuals seeking to learn or memorize information, such as:

* Students studying academic subjects.
* Language learners acquiring vocabulary or grammar.
* Professionals memorizing technical concepts or procedures.
* Anyone needing to commit facts to memory efficiently.

4. System Architecture

The application follows a client-server architecture:

Frontend (Client): A single-page application (SPA) built with React and TypeScript. It handles user interface rendering, interaction, and communication with the backend API. Styling is done using standard CSS.
Backend (Server): A RESTful API built with Node.js, Express, and TypeScript. It manages the application state (flashcard buckets, practice history, current day), implements the core learning algorithm logic, and serves data to the frontend.
Communication: The frontend communicates with the backend via HTTP requests to the defined API endpoints. Data is exchanged in JSON format.
State Management (Backend): The backend currently uses in-memory storage for all application state. This state is volatile and resets upon server restart.

Technologies Used:

Frontend: React, TypeScript, CSS, Axios (for API calls)
Backend: Node.js, Express, TypeScript, CORS
Development: Vite (implied for frontend), ts-node-dev (for backend development)

 5. Frontend Specifications

5.1. Core Components

App.tsx:
    * The root component.
    * Renders the main application layout, including a title (<h1>Flashcard Learner</h1>).
    * Renders the PracticeView component.
PracticeView.tsx:
    * Manages the core practice session flow.
    State: Holds the current practice day, list of cards for the session (practiceCards), index of the currently displayed card (currentCardIndex), visibility state of the card's back (showBack), loading status (isLoading), error messages (error), and session completion status (sessionFinished).
    Lifecycle: Fetches the initial practice session data (fetchPracticeCards) on mount (useEffect).
    Functionality:
        * Displays the current day and card progress (e.g., "Card 1 of 5").
        * Renders the current card using FlashcardDisplay.
        * Provides a "Show Answer" button, which updates showBack state.
        * Once the answer is shown, displays "Easy", "Hard", "Wrong" buttons.
        * Handles answer submission (handleAnswer): Calls submitAnswer API, advances to the next card or marks the session as finished.
        * Displays a "Session Complete!" message and a "Go to Next Day" button when all cards are practiced.
        * Handles advancing the day (handleNextDay): Calls advanceDay API, updates the day state, and fetches the next practice session (loadPracticeCards).
        * Displays loading indicators and error messages.
FlashcardDisplay.tsx:
    * Displays a single flashcard.
  Props: Receives the card object and showBack boolean.
    State: Manages hint display (hint), hint loading status (loadingHint), and hint error state (hintError).
    Functionality:
        * Renders the card's front (card.front).
        * Renders the card's back (card.back) or "???" based on showBack.
        * Provides a "Get Hint" button (only when the back is hidden).
        * Handles hint requests (handleGetHint): Calls fetchHint API, updates hint state, manages loading/error states.
        * Displays the fetched hint or an error message if the hint fetch fails.

 5.2. Services (services/api.ts)

* Provides functions to interact with the backend API using axios.
API_BASE_URL: Configured to http://localhost:3001/api.
Functions:
    * fetchPracticeCards(): GET /practice -> Promise<PracticeSession>
    * submitAnswer(front, back, difficulty): POST /update -> Promise<void>
    * fetchHint(card): GET /hint (with query params) -> Promise<string>
    * fetchProgress(): GET /progress -> Promise<ProgressStats> (Note: Currently unused in UI)
    * advanceDay(): POST /day/next -> Promise<{ currentDay: number }>

 5.3. Types (types/index.ts)

* Defines interfaces and enums used primarily by the frontend:
    * Flashcard: { front: string; back: string; hint?: string; tags: string[]; }
    * AnswerDifficulty: enum { Wrong = 0, Hard = 1, Easy = 2 }
    * PracticeSession: { cards: Flashcard[]; day: number; }
    * UpdateRequest: { cardFront: string; cardBack: string; difficulty: AnswerDifficulty; }
    * ProgressStats: { accuracyRate: number; bucketDistribution: Record<number, number>; averageDifficulty?: number; }

5.4. Styling (index.css, App.css)

* Provides basic application styling, layout, and theme (light/dark mode support via prefers-color-scheme).
* Uses standard CSS properties.

 6. Backend Specifications

6.1. Server Setup (server.ts)

* Uses Express.js to create the web server.
* Listens on PORT (default 3001).
Middleware:
    * cors(): Enables Cross-Origin Resource Sharing.
    * express.json(): Parses incoming JSON request bodies.

6.2. API Endpoints

GET /api/practice
    Purpose: Retrieve the flashcards scheduled for practice on the current day.
    Logic:
        1.  Gets the currentDay from state.
        2.  Gets the currentBuckets (Map) from state.
        3.  Converts buckets Map to Array-of-Sets using logic.toBucketSets.
        4.  Calls logic.practice with the bucket sets and day to get the set of cards to practice.
        5.  Converts the Set to an Array.
    Response: 200 OK with JSON { cards: Flashcard[]; day: number; }
    Errors: 500 Internal Server Error on failure.
POST /api/update
    Purpose: Record the result of a practice trial and update the card's bucket.
    Request Body: JSON { cardFront: string; cardBack: string; difficulty: AnswerDifficulty; }
    Logic:
        1.  Validates the difficulty value.
        2.  Finds the specific Flashcard object using state.findCard.
        3.  Finds the card's current bucket using state.findCardBucket.
        4.  Calls logic.update with the current buckets, card, and difficulty to get the updated BucketMap.
        5.  Updates the application state using state.setBuckets.
        6.  Finds the card's new bucket.
        7.  Creates a PracticeRecord and adds it to the history using state.addHistoryRecord.
    Response: 200 OK with JSON { message: "Card updated successfully" }
    Errors:
        * 400 Bad Request if difficulty is invalid.
        * 404 Not Found if the card doesn't exist in the state.
        * 500 Internal Server Error on other failures.
GET /api/hint
Purpose: Retrieve a hint for a specific flashcard.
    Query Parameters: cardFront (string), cardBack (string)
    Logic:
        1.  Validates query parameters.
        2.  Finds the specific Flashcard object using state.findCard.
        3.  Calls logic.getHint with the card object.
    Response: 200 OK with JSON { hint: string }
    Errors:
        * 400 Bad Request if query parameters are missing or invalid.
        * 404 Not Found if the card doesn't exist.
        * 500 Internal Server Error on other failures.
GET /api/progress
    Purpose: Calculate and retrieve learning progress statistics.
    Logic:
        1.  Gets currentBuckets and practiceHistory from state.
        2.  Formats history records to include the Flashcard object (requires looking up cards).
        3.  Calls logic.computeProgress with the buckets and formatted history.
    Response: 200 OK with JSON ProgressStats object.
    Errors: 500 Internal Server Error on failure (including if a card in history is not found).
POST /api/day/next
    Purpose: Advance the simulation to the next day.
    Logic: Calls state.incrementDay.
    Response: 200 OK with JSON { message: string; currentDay: number; }
    Errors: None explicitly handled, potential for future state-related errors.

6.3. State Management (state.ts)

Storage: In-memory variables (currentBuckets, practiceHistory, currentDay).
Initial State:
    * initialCards: Predefined array of Flashcard objects.
    * currentBuckets: Initialized as a Map with bucket 0 containing all initialCards.
    * practiceHistory: Initialized as an empty array.
    * currentDay: Initialized to 0.
Functions:
    * getBuckets(): Returns the current BucketMap.
    * setBuckets(newBuckets): Overwrites the current BucketMap.
    * getHistory(): Returns the PracticeRecord[].
    * addHistoryRecord(record): Appends a record to the history array.
    * getCurrentDay(): Returns the current day number.
    * incrementDay(): Increments the currentDay.
    * findCard(front, back): Searches all buckets for a card matching front/back; returns Flashcard | undefined.
    * findCardBucket(card): Finds the bucket number containing the given Flashcard instance; returns number | undefined.

6.4. Core Algorithm Logic (logic/algorithm.ts)

* Implements the functions described in the problem set handout.
toBucketSets(buckets: BucketMap): Array<Set<Flashcard>>: Converts Map representation to Array-of-Sets.
getBucketRange(buckets: Array<Set<Flashcard>>): { minBucket: number; maxBucket: number } | undefined: Finds the min/max bucket indices containing cards. (Note: Currently unused by API).
practice(buckets: Array<Set<Flashcard>>, day: number): Set<Flashcard>: Selects cards for practice based on the Modified-Leitner schedule (bucket i practiced every 2^i days, starting from day = 0). Throws error if day < 0.
update(buckets: BucketMap, card: Flashcard, difficulty: AnswerDifficulty): BucketMap: Updates card's bucket based on difficulty:
    * Wrong: Moves to bucket 0.
    * Hard: Moves to bucket i-1 (min 0).
    * Easy: Moves to bucket i+1.
    * Handles moving cards between sets within the map. Throws error if card not found.
getHint(card: Flashcard): string:
    Spec:Returns card.hint if non-empty (trimmed), otherwise returns a generated string: "Think about the key concepts related to [front]". Deterministic.
computeProgress(buckets: BucketMap, history: Array<{ card: Flashcard; difficulty: AnswerDifficulty; timestamp: number }>): ProgressStats:
    Spec:Calculates accuracyRate (Easy / Total), bucketDistribution (count per bucket), averageDifficulty (mean of historical difficulties).
    Preconditions: Requires valid BucketMap (non-negative integer keys) and valid history array. Checks preconditions and throws errors if violated.

6.5. Data Structures (logic/flashcards.ts, types/index.ts)

Flashcard (class): Immutable object with front, back, hint (string), tags (ReadonlyArray<string>).
AnswerDifficulty (enum): Wrong = 0, Hard = 1, Easy = 2.
BucketMap (type): Map<number, Set<Flashcard>>.
PracticeRecord (interface): { cardFront: string; cardBack: string; timestamp: number; difficulty: AnswerDifficulty; previousBucket: number; newBucket: number; } (Used for history).
ProgressStats (interface): { accuracyRate: number; bucketDistribution: Record<number, number>; averageDifficulty?: number; } (Output of computeProgress).
UpdateRequest (interface): { cardFront: string; cardBack: string; difficulty: AnswerDifficulty; } (API request body).
7. Deployment & Setup

Backend: Run npm install, then npm run build, then npm start. For development: npm run dev.
Frontend: Navigate to the frontend directory, run npm install, then npm run dev (or npm run build and serve the dist folder).
Requires Node.js and npm installed.



## Design Decisions

### Deck Instance Scope (Phase 1)

**Decision:** For Phase In-Memory Card Save, the `Deck` instance is created and managed within the **Popup script scope (`popup.ts`)**.

**Rationale:**

* **Simplicity:** This approach is simpler for the initial implementation, allowing direct access to the `deck` object from the popup's UI logic without requiring background script setup or message passing.
* **Phase Goal Alignment:** It fulfills the basic "in-memory" requirement for this phase, focusing on card creation and adding to a temporary Deck.

**Limitations & Future Plans:**

* The deck state is **not persistent** and will be lost every time the popup is closed.
* This scope will be revisited in later phases when implementing persistent storage using `chrome.storage` or backend integration. At that point, the primary data management logic will likely move to a background script (Service Worker) or rely on API calls.


## Changes made in `popup.ts`:**

1.  **Import `Card`:** Added `import { Card } from './Card';`.
2.  **`handleSaveCardClick` Function:** Created a dedicated function to contain the logic for saving.
3.  **Get Elements:** Inside `handleSaveCardClick`, it gets references to the front/back textareas and the status message element using `document.getElementById` and type assertions (`as HTML...Element`).
4.  **Input Validation:** It retrieves the `.value` from the textareas, `.trim()`s whitespace, and checks if either is empty. If so, it updates the status message with an error and exits.
5.  **Create Card:** If valid, it creates `new Card(frontText, backText)`.
6.  **Add to Deck:** It calls `deck.addCard(newCard)`.
7.  **Feedback:** Updates the status message (`.textContent` and `.style.color`) for success or errors (using a `try...catch` block for safety).
8.  **Console Logging:** Logs the deck size and contents upon successful save.
9.  **Clear Back Field:** Clears `backTextArea.value` on success.
10. **Button State:** Disables the button during the save operation and re-enables it afterward (using `setTimeout` for a brief visual cue) to prevent accidental double-clicks.
11. **Event Listener Setup:** In the `DOMContentLoaded` listener, it finds the `#save-card` button and attaches the `handleSaveCardClick` function to its `click` event. Includes error handling in case the button isn't found.

**Completion:**

With these changes in `extension/src/popup.ts`, the task **P1-C3-S4** is complete. Your "Save Card" button is now functional within the popup's lifecycle. You can test it by:

1.  Running `npm run build`.
2.  Reloading the extension.
3.  Selecting text on a page.
4.  Opening the popup.
5.  Typing text into the "Back" field.
6.  Clicking "Save Card".
7.  Checking the status message and the browser console logs.
8.  Trying to save with empty fields to see the error message.
Remember that closing and reopening the popup will reset the deck because it's currently only stored in the popup's memory.
