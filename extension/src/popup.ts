import { Card } from './Card';
import { GestureRecognizer, Gesture } from './srs/GestureRecognizer';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl'; 
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsTfjsModelConfig, Keypoint } from '@tensorflow-models/hand-pose-detection';

const REQUIRED_CONFIDENCE = 5;
const REVIEW_ACTION_DELAY_MS = 1500; 
const API_BASE_URL = 'http://localhost:3001/api'; 
const POST_REVIEW_SUCCESS_DELAY_MS = 1000;

type BackendCardType = {
    id: number;
    front: string;
    back: string;
    hint?: string | null;
    tags?: string[] | null;
    due_date?: string; 
};

enum AnswerDifficulty { Wrong = 0, Hard = 1, Easy = 2 }

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

let videoElement: HTMLVideoElement | null = null;
let tfStatusElement: HTMLElement | null = null;
let reviewFrontElement: HTMLElement | null = null;
let reviewBackElement: HTMLElement | null = null;
let showAnswerButton: HTMLButtonElement | null = null;
let gestureStatusElement: HTMLElement | null = null;
let saveButtonElement: HTMLButtonElement | null = null;
let cardFrontTextArea: HTMLTextAreaElement | null = null;
let cardBackTextArea: HTMLTextAreaElement | null = null;
let saveStatusMessageElement: HTMLElement | null = null;
let canvasElement: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;
let reviewContainerElement: HTMLElement | null = null; 
let noCardsMessageElement: HTMLElement | null = null; 

let handPoseModel: handPoseDetection.HandDetector | null = null;
let gestureRecognizerInstance: GestureRecognizer | null = null;
let isDetecting = false; 

let currentPracticeCards: BackendCardType[] = [];
let currentPracticeIndex: number = 0;
let currentDisplayedCard: BackendCardType | null = null; 
let currentPracticeDay: number = -1; 

let lastDetectedGesture: Gesture = Gesture.Unknown;
let currentGestureConfidence: number = 0;


// --- Webcam and Model Setup ---
/**
 * Attempts to access the user's webcam and stream it to the video element.
 * Sets up the hidden canvas dimensions based on the video stream.
 *
 * @returns {Promise<boolean>} True if webcam access and stream setup succeeded, false otherwise.
 * @spec.requires `videoElement`, `tfStatusElement`, `canvasElement` are assigned to valid DOM elements.
 * @spec.effects Requests webcam permission from the user. If granted, starts video stream, updates `tfStatusElement` text, sets `canvasElement` dimensions. If denied or error occurs, updates `tfStatusElement` with an error message. Modifies `videoElement.srcObject`.
 * @spec.modifies `videoElement`, `tfStatusElement`, `canvasElement`.
 */
async function setupWebcam(): Promise<boolean> {
    if (!videoElement || !tfStatusElement || !canvasElement) return false;
    tfStatusElement.textContent = "Requesting webcam access...";
    console.log("Requesting webcam access...");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tfStatusElement.textContent = "Webcam access granted. Starting stream...";
        console.log("Webcam access granted.");
        videoElement.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
           const timer = setTimeout(() => reject(new Error("Video setup timeout")), 5000);
           videoElement?.addEventListener('loadedmetadata', () => {
               console.log("Video metadata loaded.");
                videoElement?.play().then(() => {
                    console.log("Video playing."); clearTimeout(timer); resolve();
                }).catch(err => { console.error("Video play error:", err); clearTimeout(timer); reject(err); });
           }, { once: true });
        });
        const wcCont = document.getElementById("webcam-container");
        if (wcCont) wcCont.style.backgroundColor = 'transparent';
        videoElement.style.display = 'block';
         if (videoElement.videoWidth > 0) {
             canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight;
             console.log(`Canvas dimensions set: ${canvasElement.width}x${canvasElement.height}`);
         } else { console.warn("Video dimensions not available immediately after play()."); }
        tfStatusElement.textContent = "Webcam ready."; console.log("Webcam setup successful."); return true;
    } catch (error: any) {
        console.error("Error accessing/starting webcam:", error);
        let msg = "Error accessing webcam.";
        if (error instanceof Error) {
             if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") { msg = "Webcam permission denied."; }
             else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") { msg = "No webcam found."; }
             else { msg = `Webcam Error: ${error.message}`; }
        }
        if (tfStatusElement) tfStatusElement.textContent = msg; return false;
    }
}

/**
 * Loads the TensorFlow.js Hand Pose Detection model (MediaPipeHands).
 *
 * @returns {Promise<handPoseDetection.HandDetector | null>} The loaded detector instance, or null if loading failed.
 * @spec.requires `tfStatusElement` is assigned to a valid DOM element. TFJS backend (`webgl`) is available.
 * @spec.effects Asynchronously downloads and initializes the hand pose model. Updates `tfStatusElement` text during loading and on completion/error.
 * @spec.modifies `tfStatusElement`.
 */
async function loadHandPoseModel(): Promise<handPoseDetection.HandDetector | null> {
     if (!tfStatusElement) return null;
    tfStatusElement.textContent = "Loading hand pose model (MediaPipe)..."; console.log("Loading hand pose model...");
    try {
        await tf.setBackend('webgl'); await tf.ready(); console.log(`TFJS Backend Ready: ${tf.getBackend()}`);
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: MediaPipeHandsTfjsModelConfig = { runtime: 'tfjs', modelType: 'lite', maxHands: 1 };
        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        console.log("Hand pose model loaded successfully."); tfStatusElement.textContent = "Model loaded."; return detector;
    } catch (error) { console.error("Error loading hand pose model:", error); if (tfStatusElement) tfStatusElement.textContent = "Error loading model."; return null; }
}

// --- Detection Loop Control ---
/**
 * Starts the hand detection loop if prerequisites are met.
 * Sets the `isDetecting` flag to true and calls `detectHandsLoop`.
 *
 * @spec.requires `handPoseModel`, `gestureRecognizerInstance`, `videoElement` are initialized and ready.
 * @spec.effects If not already detecting, sets `isDetecting` to true and schedules the first frame of `detectHandsLoop`. Updates `gestureStatusElement` if prerequisites are not met.
 * @spec.modifies `isDetecting`, `gestureStatusElement` (potentially).
 */
function startDetectionLoop() {
    if (!isDetecting && handPoseModel && gestureRecognizerInstance && videoElement && videoElement.readyState >= 3) {
        console.log("Starting detection loop..."); isDetecting = true; detectHandsLoop();
    } else if (isDetecting) { console.log("Detection loop already running."); }
    else { console.warn("Cannot start detection loop: Model, Recognizer, or Video not ready."); if (gestureStatusElement) gestureStatusElement.textContent = "Setup incomplete..."; }
}

/**
 * Stops the hand detection loop by setting the `isDetecting` flag to false.
 * The currently executing animation frame will finish, but no new frames will be requested.
 *
 * @spec.effects Sets `isDetecting` to false. Updates `gestureStatusElement` text.
 * @spec.modifies `isDetecting`, `gestureStatusElement`.
 */
function stopDetectionLoop() {
    if (isDetecting) { console.log("Stopping detection loop."); isDetecting = false; if (gestureStatusElement) { gestureStatusElement.textContent = "Detection Paused / Idle"; } }
}

// --- Core Detection and Review Logic ---
/**
 * The main loop function, called via `requestAnimationFrame`.
 * Performs hand detection, gesture recognition, debouncing, and triggers API updates for reviews.
 * Handles pausing and resuming detection flow.
 *
 * @spec.requires `isDetecting` is true. `handPoseModel`, `videoElement`, `gestureRecognizerInstance`, `canvasElement`, `canvasCtx` are initialized.
 * @spec.effects Continuously:
 *   - Draws video frame to canvas.
 *   - Calls `handPoseModel.estimateHands`.
 *   - Calls `gestureRecognizerInstance.recognizeGesture`.
 *   - Updates `currentGestureConfidence` and `lastDetectedGesture` state.
 *   - If a confident gesture is detected and a card is displayed (`currentDisplayedCard` is not null):
 *     - Maps gesture to `AnswerDifficulty`.
 *     - Pauses detection (`isDetecting = false`).
 *     - Updates `gestureStatusElement` to "Updating...".
 *     - Sends a `fetch` request to `POST /api/update` with `cardId` and `difficulty`.
 *     - On API success: Updates `gestureStatusElement` to "Action... Updated.", waits `POST_REVIEW_SUCCESS_DELAY_MS`, increments `currentPracticeIndex`, calls `displayCardForReview`.
 *     - On API error: Updates `gestureStatusElement` with error message, keeps current card displayed.
 *     - Resets `currentGestureConfidence`, `lastDetectedGesture`.
 *     - Schedules `startDetectionLoop` via `setTimeout` after `REVIEW_ACTION_DELAY_MS`.
 *     - Returns early to prevent immediate next frame request.
 *   - If no action taken, updates `gestureStatusElement` with current detected gesture and confidence.
 *   - If `isDetecting` remains true, schedules the next call via `requestAnimationFrame`.
 * @spec.modifies `currentGestureConfidence`, `lastDetectedGesture`, `isDetecting`, `gestureStatusElement`, potentially calls `displayCardForReview` (which modifies other state).
 */
async function detectHandsLoop() {
    if (!isDetecting) { console.log("isDetecting is false, loop stopping."); return; }
    if (!handPoseModel || !videoElement || !gestureRecognizerInstance || !canvasElement || !canvasCtx || videoElement.readyState < 3 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.warn("Detection loop waiting for readiness...");
        requestAnimationFrame(detectHandsLoop);
        return;
    }

    let currentFrameGesture: Gesture = Gesture.Unknown;
    try {
        if (canvasElement!.width !== videoElement!.videoWidth || canvasElement!.height !== videoElement!.videoHeight) {
            canvasElement!.width = videoElement!.videoWidth; canvasElement!.height = videoElement!.videoHeight;
        }
        canvasCtx!.drawImage(videoElement!, 0, 0, canvasElement!.width, canvasElement!.height);
        const hands = await handPoseModel.estimateHands(canvasElement!, { flipHorizontal: false });
        if (hands.length > 0 && hands[0]?.keypoints) {
            currentFrameGesture = gestureRecognizerInstance!.recognizeGesture(hands[0].keypoints);
        } else { currentFrameGesture = Gesture.Unknown; }
    } catch (error) { console.error(`Error during hand detection/recognition:`, error); currentFrameGesture = Gesture.Unknown; }

    if (currentFrameGesture === lastDetectedGesture && currentFrameGesture !== Gesture.Unknown) { currentGestureConfidence++; }
    else { currentGestureConfidence = (currentFrameGesture !== Gesture.Unknown) ? 1 : 0; }
    lastDetectedGesture = currentFrameGesture;

    let confidentGesture = Gesture.Unknown;
    let actionTaken = false;

    if (currentGestureConfidence >= REQUIRED_CONFIDENCE) {
        confidentGesture = lastDetectedGesture;
        console.log(`CONFIDENT GESTURE DETECTED: ${confidentGesture}`);

        if (currentDisplayedCard) {
            let reviewResult: AnswerDifficulty | null = null;
            switch (confidentGesture) {
                case Gesture.ThumbsDown: reviewResult = AnswerDifficulty.Wrong; break;
                case Gesture.FlatHand: reviewResult = AnswerDifficulty.Hard; break;
                case Gesture.ThumbsUp: reviewResult = AnswerDifficulty.Easy; break;
            }

            if (reviewResult !== null) {
                actionTaken = true;
                isDetecting = false;

                const updateData = { cardId: currentDisplayedCard.id, difficulty: reviewResult };
                console.log(`Sending update to API for card ID ${currentDisplayedCard.id}:`, updateData);
                if (gestureStatusElement) gestureStatusElement.textContent = `Updating (${confidentGesture})...`;

                try {
                    const updateResponse = await fetch(`${API_BASE_URL}/update`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData)
                    });

                    if (!updateResponse.ok) {
                        let errorMsg = `API Error: ${updateResponse.status} ${updateResponse.statusText}`;
                        try { const errData = await updateResponse.json(); errorMsg = errData?.error || errData?.message || errorMsg; } catch (e) {}
                        throw new Error(errorMsg);
                    }

                    const responseData = await updateResponse.json();
                    console.log("Update successful via API:", responseData.message);
                    if (gestureStatusElement) gestureStatusElement.textContent = `Action: ${confidentGesture}! Updated.`;

                    await delay(POST_REVIEW_SUCCESS_DELAY_MS);

                    currentPracticeIndex++;
                    displayCardForReview();

                } catch (error: any) {
                    console.error("Failed to update card via API:", error);
                    if (gestureStatusElement) gestureStatusElement.textContent = `Error updating: ${error.message}`;
                    actionTaken = false;
                }

                currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown;
                console.log(`Will resume detection after ${REVIEW_ACTION_DELAY_MS}ms pause...`);
                setTimeout(() => {
                     if (gestureStatusElement && (gestureStatusElement.textContent?.startsWith('Action:') || gestureStatusElement.textContent?.startsWith('Error updating:'))) {
                         gestureStatusElement.textContent = "Gesture: Unknown";
                     }
                    if (document.visibilityState === 'visible') { console.log("Resuming detection loop."); startDetectionLoop(); }
                    else { console.log("Popup closed during pause, skipping resumption."); isDetecting = false; }
                }, REVIEW_ACTION_DELAY_MS);

                return;

            } else {currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown; }
        } else { console.log(`Confident gesture detected, but no card currently being reviewed.`); currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown; }
    }

    if (!actionTaken && gestureStatusElement) {
         const displayGesture = (currentGestureConfidence > 0) ? lastDetectedGesture : Gesture.Unknown;
         const confidenceText = currentGestureConfidence > 0 ? ` (${currentGestureConfidence})` : '';
         if (!gestureStatusElement.textContent?.startsWith('Updating') && !gestureStatusElement.textContent?.startsWith('Error')) {
            gestureStatusElement.textContent = `Gesture: ${displayGesture}${confidenceText}`;
         }
    }

    if (isDetecting) { requestAnimationFrame(detectHandsLoop); }
}

/**
 * Fetches the current practice session from the backend API if needed,
 * updates the internal state (`currentPracticeCards`, `currentPracticeIndex`, `currentPracticeDay`),
 * and displays the next card for review or a "no cards" message.
 * Handles fetching errors and updates UI elements accordingly.
 * Starts the detection loop if a card is displayed.
 *
 * @spec.requires All relevant DOM elements (`reviewFrontElement`, `reviewBackElement`, etc.) are assigned. Backend API (`/api/practice`) is reachable and returns data in the expected format `{ cards: BackendCardType[], day: number }`.
 * @spec.effects Makes a `fetch` request to `/api/practice` if `currentPracticeIndex >= currentPracticeCards.length`. Modifies module state variables: `currentPracticeCards`, `currentPracticeIndex`, `currentDisplayedCard`, `currentPracticeDay`. Updates text content and display style of DOM elements: `reviewContainerElement`, `noCardsMessageElement`, `reviewFrontElement`, `reviewBackElement`, `showAnswerButton`, `gestureStatusElement`. Calls `startDetectionLoop()` or `stopDetectionLoop()`.
 * @spec.modifies `currentPracticeCards`, `currentPracticeIndex`, `currentDisplayedCard`, `currentPracticeDay`, DOM elements.
 */
async function displayCardForReview() {
    console.log("Attempting to display card for review...");
    if (!reviewFrontElement || !reviewBackElement || !showAnswerButton || !gestureStatusElement || !reviewContainerElement || !noCardsMessageElement) { console.error("DisplayCard called but critical review UI elements are missing!"); return; }

    reviewContainerElement.style.display = 'none'; noCardsMessageElement.style.display = 'none';
    reviewBackElement.textContent = '???'; reviewBackElement.style.display = 'block';
    showAnswerButton.style.display = 'block'; showAnswerButton.disabled = true;
    gestureStatusElement.textContent = 'Initializing...'; currentDisplayedCard = null;

    if (currentPracticeIndex >= currentPracticeCards.length) {
        if (!await fetchPracticeData()) {
            return;
        }
    }

    if (currentPracticeCards.length > 0 && currentPracticeIndex < currentPracticeCards.length) {
        currentDisplayedCard = currentPracticeCards[currentPracticeIndex];
        reviewContainerElement.style.display = 'block'; noCardsMessageElement.style.display = 'none';
        reviewFrontElement!.textContent = currentDisplayedCard.front;
        reviewBackElement!.textContent = '???'; reviewBackElement!.style.display = 'block';
        showAnswerButton!.style.display = 'block'; showAnswerButton!.disabled = false;
        gestureStatusElement!.textContent = `Card ${currentPracticeIndex + 1} of ${currentPracticeCards.length}. Day ${currentPracticeDay}. Gesture: Unknown`;
        console.log(`Displaying card ID ${currentDisplayedCard.id} for review: "${currentDisplayedCard.front}"`);
        startDetectionLoop();
    } else {
        currentDisplayedCard = null;
        console.log("No cards due for practice.");
        reviewContainerElement.style.display = 'none';
        noCardsMessageElement!.textContent = `No cards due for practice on Day ${currentPracticeDay}. Try creating more cards or advancing the day!`;
        noCardsMessageElement!.style.display = 'block';
        gestureStatusElement!.textContent = "Session complete!";
        showAnswerButton!.style.display = 'none';
        stopDetectionLoop();
    }
    lastDetectedGesture = Gesture.Unknown; currentGestureConfidence = 0;
}

/**
 * Helper function to fetch practice cards from the backend. Includes basic retry logic.
 *
 * @returns {Promise<boolean>} True if fetch succeeded (even if 0 cards returned), false if a network/API error occurred.
 * @spec.requires `API_BASE_URL` is correct. Backend is running. DOM elements `#gesture-status`, `#no-cards-message` exist.
 * @spec.effects Makes one or two `fetch` requests to `GET /api/practice`. Modifies `currentPracticeCards`, `currentPracticeDay`, `currentPracticeIndex`. Updates `#gesture-status`, `#no-cards-message` DOM elements based on fetch outcome. Calls `stopDetectionLoop` on error.
 * @spec.modifies `currentPracticeCards`, `currentPracticeDay`, `currentPracticeIndex`, `gestureStatusElement`, `noCardsMessageElement`.
 */
async function fetchPracticeData(): Promise<boolean> {
    console.log("Fetching new practice session from API...");
    if (gestureStatusElement) gestureStatusElement.textContent = 'Loading cards...';

    try {
        const response = await fetch(`${API_BASE_URL}/practice`);
        if (!response.ok) { let errorMsg = `API Error: ${response.status} ${response.statusText}`; try { const errData = await response.json(); errorMsg = errData?.error || errData?.message || errorMsg; } catch(e){} throw new Error(errorMsg); }
        const sessionData = await response.json();
        if (!sessionData || !Array.isArray(sessionData.cards) || typeof sessionData.day !== 'number') { throw new Error("Invalid data format received from API."); }

        currentPracticeCards = sessionData.cards;
        currentPracticeDay = sessionData.day;
        currentPracticeIndex = 0;
        console.log(`Fetched ${currentPracticeCards.length} cards for day ${currentPracticeDay}`);
        if (gestureStatusElement) gestureStatusElement.textContent = 'Cards loaded.';
        return true;

    } catch (error: any) {
        console.error(`Failed to fetch practice cards:`, error);
        if (gestureStatusElement) gestureStatusElement.textContent = `Error loading cards!`;
        if (noCardsMessageElement) { noCardsMessageElement.textContent = `Error loading cards: ${error.message}. Is the backend running?`; noCardsMessageElement.style.display = 'block'; }
        stopDetectionLoop();
        currentPracticeCards = []; currentPracticeIndex = 0;
        return false;
    }
}

// --- Utility and Event Handlers ---

/**
 * Sends a message to the content script of the active tab to retrieve selected text.
 * Updates the `#card-front` textarea with the result.
 *
 * @spec.requires `chrome.tabs` and `chrome.runtime` APIs are available. `cardFrontTextArea` element exists. Content script (`content.js`) is injected and listening for `GET_SELECTED_TEXT` action in the active tab.
 * @spec.effects Sends a message via `chrome.tabs.sendMessage`. Updates the `value` or `placeholder` of `cardFrontTextArea` based on the response or errors.
 * @spec.modifies `cardFrontTextArea`.
 */
function fetchSelectedText() {
    if (!cardFrontTextArea) { console.error("Cannot fetch text, front text area element not found initially."); return; }
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) { console.warn("Chrome APIs not available. Skipping text fetch."); cardFrontTextArea.placeholder = "Cannot fetch text (not an extension?)."; return; }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (chrome.runtime.lastError) { console.error("Error querying tabs:", chrome.runtime.lastError.message); return; }
        if (tabs.length === 0 || !tabs[0]) { console.error("No active tab found."); return; }
        const activeTab = tabs[0];
        if (!activeTab.id || activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://')) { console.warn(`Cannot send message to restricted tab: ${activeTab.url}`); if (cardFrontTextArea) cardFrontTextArea.placeholder = "Cannot get text from this page."; return; }

        console.log(`Sending message to tab ${activeTab.id}`);
        chrome.tabs.sendMessage( activeTab.id, { action: "GET_SELECTED_TEXT" }, (response?: { selectedText?: string }) => {
            if (chrome.runtime.lastError) { console.warn("Error receiving message response:", chrome.runtime.lastError.message); const el = document.getElementById("card-front") as HTMLTextAreaElement | null; if (el && !el.value) el.placeholder = "Couldn't connect to page."; return; }
            const localCardFrontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
            if (!localCardFrontTextArea) { console.error("cardFrontTextArea element not found inside sendMessage callback!"); return; }
            if (response && typeof response.selectedText === 'string') { localCardFrontTextArea.value = response.selectedText; console.log("Updated textarea with selected text:", response.selectedText); }
            else { console.log("No text selected or invalid response received."); if (!localCardFrontTextArea.value) { localCardFrontTextArea.placeholder = "No text selected on page."; } }
        });
    });
}

/**
 * Event handler for the "Show Answer" button.
 * Displays the back text of the currently displayed card.
 *
 * @spec.requires `currentDisplayedCard` is not null. `reviewBackElement` and `showAnswerButton` elements exist.
 * @spec.effects Updates the `textContent` and `display` style of `reviewBackElement`. Updates the `disabled` and `display` style of `showAnswerButton`.
 * @spec.modifies `reviewBackElement`, `showAnswerButton`.
 */
function handleShowAnswerClick() {
    console.log("Show Answer button clicked.");
    if (currentDisplayedCard && reviewBackElement && showAnswerButton) {
        reviewBackElement.textContent = currentDisplayedCard.back;
        reviewBackElement.style.display = 'block';
        showAnswerButton.disabled = true; showAnswerButton.style.display = 'none';
        console.log(`Showing answer for card ID ${currentDisplayedCard.id}: "${currentDisplayedCard.front}"`);
    } else { console.warn("Cannot show answer: No current card or UI elements missing."); }
}

/**
 * Event handler for the "Save Card" button.
 * Validates input, sends card data to the backend API via `POST /api/cards`,
 * handles the response, updates UI status, and invalidates the local practice list on success.
 *
 * @spec.requires `cardFrontTextArea`, `cardBackTextArea`, `saveStatusMessageElement`, `saveButtonElement` elements exist. Backend API (`/api/cards`) is reachable.
 * @spec.effects Makes a `fetch` request to `POST /api/cards`. Modifies `textContent` and `style.color` of `saveStatusMessageElement`. Modifies `disabled` state and `textContent` of `saveButtonElement`. Clears `cardBackTextArea.value` on success. Modifies `currentPracticeCards` and `currentPracticeIndex` on success by resetting them.
 * @spec.modifies `saveStatusMessageElement`, `saveButtonElement`, `cardBackTextArea`, `currentPracticeCards`, `currentPracticeIndex`.
 */
async function handleSaveCardClick() {
    if (!cardFrontTextArea || !cardBackTextArea || !saveStatusMessageElement || !saveButtonElement) { console.error("Save card UI elements not found!"); return; }
    const frontText = cardFrontTextArea.value.trim(); const backText = cardBackTextArea.value.trim();
    if (frontText === "" || backText === "") { saveStatusMessageElement.textContent = "Error: Both Front and Back fields are required."; saveStatusMessageElement.style.color = "red"; console.warn("Save attempt failed: Empty fields."); return; }

    saveButtonElement.disabled = true; saveButtonElement.textContent = "Saving...";
    saveStatusMessageElement.textContent = "Saving to server..."; saveStatusMessageElement.style.color = "orange";

    try {
        const cardData = { front: frontText, back: backText, };
        console.log(`Sending card data to API:`, cardData);
        const response = await fetch(`${API_BASE_URL}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(cardData), });

        if (response.ok && response.status === 201) {
            const createdCard: BackendCardType = await response.json();
            saveStatusMessageElement.textContent = "Card saved successfully!"; saveStatusMessageElement.style.color = "green";
            console.log(`Card saved via API. ID: ${createdCard.id}`);
            cardBackTextArea.value = "";
            console.log("Invalidating practice list due to new card save.");
            currentPracticeCards = [];
            currentPracticeIndex = 0;
            setTimeout(() => { if (saveStatusMessageElement) saveStatusMessageElement.textContent = ""; }, 3000);
        } else {
            let errorMsg = `Error: ${response.status} ${response.statusText}`; try { const errorData = await response.json(); errorMsg = errorData?.error || errorData?.message || errorMsg; } catch (e) { }
            saveStatusMessageElement.textContent = `Error saving card: ${errorMsg}`; saveStatusMessageElement.style.color = "red";
            console.error("Error saving card via API:", response.status, response.statusText, errorMsg);
        }
    } catch (error) {
        saveStatusMessageElement.textContent = "Network Error: Could not connect to server."; saveStatusMessageElement.style.color = "red";
        console.error("Network error saving card:", error);
    } finally { saveButtonElement.disabled = false; saveButtonElement.textContent = "Save Card"; }
}

// --- Initialization ---
/**
 * Initializes the application state, sets up webcam and ML model,
 * fetches initial data, and attaches event listeners.
 * Runs once the popup's DOM is fully loaded.
 *
 * @spec.requires All necessary DOM elements defined in the variable assignments exist in `popup.html`. `chrome` APIs are available (if run as an extension).
 * @spec.effects Assigns DOM elements to module variables. Calls `fetchSelectedText`, `setupWebcam`, `loadHandPoseModel`, `displayCardForReview`. Initializes `gestureRecognizerInstance`. Attaches click listeners to buttons. Updates `tfStatusElement` based on setup progress/outcome.
 * @spec.modifies All module-level state variables and potentially the entire `document.body.innerHTML` on fatal error.
 */
async function initializeApp() {
    console.log("Initializing app...");
    videoElement = document.getElementById("webcam-feed") as HTMLVideoElement | null;
    tfStatusElement = document.getElementById("tf-status") as HTMLElement | null;
    reviewFrontElement = document.getElementById("review-front") as HTMLElement | null;
    reviewBackElement = document.getElementById("review-back") as HTMLElement | null;
    showAnswerButton = document.getElementById("show-answer") as HTMLButtonElement | null;
    gestureStatusElement = document.getElementById("gesture-status") as HTMLElement | null;
    saveButtonElement = document.getElementById("save-card") as HTMLButtonElement | null;
    cardFrontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
    cardBackTextArea = document.getElementById("card-back") as HTMLTextAreaElement | null;
    saveStatusMessageElement = document.getElementById("status-message") as HTMLElement | null;
    canvasElement = document.getElementById("hidden-canvas") as HTMLCanvasElement | null;
    reviewContainerElement = document.getElementById("review-container") as HTMLElement | null;
    noCardsMessageElement = document.getElementById('no-cards-message') as HTMLElement | null;

    const criticalElements = [videoElement, tfStatusElement, reviewFrontElement, reviewBackElement, showAnswerButton, gestureStatusElement, saveButtonElement, cardFrontTextArea, cardBackTextArea, saveStatusMessageElement, canvasElement, reviewContainerElement, noCardsMessageElement];
    if (criticalElements.some(el => el === null)) { console.error("FATAL: Critical UI elements missing. Check IDs in popup.html."); document.body.innerHTML = "<h1>Error: Popup HTML structure is incorrect.</h1>"; return; }

    canvasCtx = canvasElement!.getContext('2d');
    if (!canvasCtx) { console.error("FATAL: Could not get 2D context from canvas."); tfStatusElement!.textContent = "Error: Canvas context failed."; return; }

    fetchSelectedText();
    gestureRecognizerInstance = new GestureRecognizer();
    const webcamReady = await setupWebcam();
    if (webcamReady) {
        console.log("Webcam ready, loading model...");
        handPoseModel = await loadHandPoseModel();
        if (handPoseModel && gestureRecognizerInstance) {
            tfStatusElement!.textContent = "Model ready.";
            displayCardForReview();
        } else {
            console.error("Model/Recognizer load failed.");
            tfStatusElement!.textContent = "Error: Model load failed.";
            displayCardForReview();
        }
    } else {
        console.error("Webcam setup failed.");
        tfStatusElement!.textContent = "Webcam setup failed.";
        displayCardForReview();
    }

    saveButtonElement!.addEventListener('click', handleSaveCardClick);
    showAnswerButton!.addEventListener('click', handleShowAnswerClick);

    console.log("Initialization sequence complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('unload', () => { stopDetectionLoop(); console.log("Popup closing, detection loop stopped."); });

console.log("Popup script loaded (ts).");