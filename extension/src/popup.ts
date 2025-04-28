// extension/src/popup.ts
import { Deck } from './Deck';
import { Card } from './Card';
import { GestureRecognizer, Gesture } from './srs/GestureRecognizer';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl'; // Import backend needed for TFJS
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsTfjsModelConfig, Keypoint } from '@tensorflow-models/hand-pose-detection';


// --- Global Variables ---
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

let handPoseModel: handPoseDetection.HandDetector | null = null;
let gestureRecognizerInstance: GestureRecognizer | null = null;
let isDetecting = false;
let currentCard: Card | null = null;
let lastDetectedGesture: Gesture = Gesture.Unknown;
let currentGestureConfidence: number = 0;
const REQUIRED_CONFIDENCE = 5;
// --------------------------

const deck = new Deck();
console.log("Deck instance created:", deck);

/**
 * Sets up the webcam feed.
 * Assumes videoElement and tfStatusElement are already assigned.
 * @returns {Promise<boolean>} True if setup was successful, false otherwise.
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
        // Wait for video to be ready
        await Promise.all([
             new Promise<void>((resolve) => { videoElement?.addEventListener('loadedmetadata', () => { console.log("Video metadata loaded."); resolve(); }, { once: true }); }),
             new Promise<void>((resolve) => { videoElement?.addEventListener('playing', () => { console.log("Video playing."); resolve(); }, { once: true }); })
        ]);
        const wcCont = document.getElementById("webcam-container");
        if (wcCont) wcCont.style.backgroundColor = 'transparent';
        videoElement.style.display = 'block';

        // Set canvas dimensions based on video after it's ready
        if (videoElement.videoWidth > 0) {
             canvasElement.width = videoElement.videoWidth;
             canvasElement.height = videoElement.videoHeight;
             console.log(`Canvas dimensions set: ${canvasElement.width}x${canvasElement.height}`);
        } else {
            console.warn("Video dimensions not available after metadata/playing.");
        }

        tfStatusElement.textContent = "Webcam ready.";
        console.log("Webcam setup successful.");
        return true;
    } catch (error) {
        console.error("Error accessing webcam:", error);
        let msg = "Error accessing webcam.";
        if (error instanceof Error) {
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") { msg = "Webcam permission denied."; }
            else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") { msg = "No webcam found."; }
            else { msg = `Webcam Error: ${error.message}`; }
        }
        tfStatusElement.textContent = msg;
        return false;
    }
}

/**
 * Loads the Hand Pose Detection model.
 * Assumes tfStatusElement is assigned before call.
 * @returns {Promise<handPoseDetection.HandDetector | null>} The loaded model or null if loading failed.
 */
async function loadHandPoseModel(): Promise<handPoseDetection.HandDetector | null> {
     if (!tfStatusElement) return null;

    tfStatusElement.textContent = "Loading hand pose model (MediaPipe)...";
    console.log("Loading hand pose model...");
    try {
        await tf.ready(); // Ensure backend is ready
        console.log(`TFJS Backend: ${tf.getBackend()}`);
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: MediaPipeHandsTfjsModelConfig = { runtime: 'tfjs', modelType: 'lite', maxHands: 1 };
        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        console.log("Hand pose model loaded successfully.");
        tfStatusElement.textContent = "Model loaded.";
        return detector;
    } catch (error) {
        console.error("Error loading hand pose model:", error);
        tfStatusElement.textContent = "Error loading model.";
        return null;
    }
}

/**
 * Continuously detects hands, recognizes gestures, applies debouncing, and triggers review actions.
 */
async function detectHandsLoop() {
    if (!isDetecting) { return; }

    // Check resources are ready for detection
    if (!handPoseModel || !videoElement || !gestureRecognizerInstance || !canvasElement || !canvasCtx ||
        videoElement.readyState < 3 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0)
    {
        requestAnimationFrame(detectHandsLoop); return;
    }

    let currentFrameGesture: Gesture = Gesture.Unknown;

    try {
        // Draw current video frame onto the hidden canvas
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // Estimate hands using the canvas content
        const hands = await handPoseModel.estimateHands(canvasElement, { flipHorizontal: false });

        if (hands.length > 0 && hands[0]?.keypoints && gestureRecognizerInstance) {
            const landmarks = hands[0].keypoints;
            if (isNaN(landmarks[0]?.x) || isNaN(landmarks[0]?.y)) {
                 console.warn(`Detected landmarks, but coordinates are NaN.`);
                 currentFrameGesture = Gesture.Unknown;
            } else {
                currentFrameGesture = gestureRecognizerInstance.recognizeGesture(landmarks);
            }
        } else {
            currentFrameGesture = Gesture.Unknown;
        }
    } catch (error) {
        console.error(`Error during hand detection/recognition:`, error);
        currentFrameGesture = Gesture.Unknown;
    }

    // Debouncing Logic
    if (currentFrameGesture === lastDetectedGesture && currentFrameGesture !== Gesture.Unknown) { currentGestureConfidence++; }
    else { currentGestureConfidence = (currentFrameGesture !== Gesture.Unknown) ? 1 : 0; }
    lastDetectedGesture = currentFrameGesture;

    // Check Confidence Threshold & Trigger Action
    let confidentGesture = Gesture.Unknown;
    if (currentGestureConfidence >= REQUIRED_CONFIDENCE) {
        confidentGesture = lastDetectedGesture;
        console.log(`CONFIDENT GESTURE DETECTED: ${confidentGesture}`);
        if (currentCard) {
            let reviewResult: number = -1;
            switch (confidentGesture) {
                case Gesture.ThumbsDown: reviewResult = 0; break;
                case Gesture.FlatHand: reviewResult = 1; break;
                case Gesture.ThumbsUp: reviewResult = 2; break;
            }
            if (reviewResult !== -1) {
                console.log(`Mapping ${confidentGesture} to difficulty ${reviewResult} for card "${currentCard.front}"`);
                deck.updateCardReview(currentCard, reviewResult); // Log the update

                // *** FIX: Remove the card from the deck after review ***
                console.log(`Removing card "${currentCard.front}" from session deck.`);
                deck.removeCard(currentCard);
                // *** END FIX ***

                currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown; // Reset debouncer
                displayCardForReview(); // Display next card
                requestAnimationFrame(detectHandsLoop); return; // Exit early after action
            } else {
                console.warn(`Confident gesture ${confidentGesture} detected but no valid review mapping.`);
                currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown;
            }
        } else {
            console.log(`Confident gesture detected, but no card is currently being reviewed.`);
            currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown;
        }
    }

    // Update Gesture Status UI
    if (gestureStatusElement) {
        const displayGesture = (currentGestureConfidence > 0) ? lastDetectedGesture : Gesture.Unknown;
        const confidenceText = currentGestureConfidence > 0 ? ` (${currentGestureConfidence})` : '';
        gestureStatusElement.textContent = `Gesture: ${displayGesture}${confidenceText}`;
    }

    // Schedule the next frame
    requestAnimationFrame(detectHandsLoop);
}


/**
 * Fetches the next card from the deck and displays its front side for review.
 * Assumes review UI elements are valid.
 */
function displayCardForReview() {
    console.log("Attempting to display next card for review...");
    if (!reviewFrontElement || !reviewBackElement || !showAnswerButton || !gestureStatusElement) {
         console.error("DisplayCard called but review elements are missing!");
         return;
    }

    currentCard = deck.getNextCardToReview();

    if (currentCard) { // If a card is available
        reviewFrontElement.textContent = currentCard.front;
        reviewBackElement.textContent = '(Answer hidden)';
        reviewBackElement.style.display = 'none';
        showAnswerButton.style.display = 'block';
        showAnswerButton.disabled = false;
        gestureStatusElement.textContent = 'Gesture: Unknown';
        console.log(`Displaying card for review: "${currentCard.front}"`);
    } else { // If no cards are left
        reviewFrontElement.textContent = '(No cards in deck to review)';
        reviewBackElement.style.display = 'none';
        showAnswerButton.style.display = 'none';
        gestureStatusElement.textContent = 'Add cards to start reviewing!';
        console.log("No cards available to review.");
    }
    // Reset debouncing state
    lastDetectedGesture = Gesture.Unknown;
    currentGestureConfidence = 0;
}


/**
 * Fetches the selected text from the active tab.
 * Assumes cardFrontTextArea exists.
 */
function fetchSelectedText() {
    if (!cardFrontTextArea) {
         console.error("Cannot fetch text, front text area element not found initially.");
         return;
    }

    if (typeof chrome === 'undefined' || !chrome.tabs) { console.error("Chrome tabs API not available."); return; }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length === 0 || !tabs[0]) { console.error("No active tab found."); return; }
        const activeTab = tabs[0];
        if (!activeTab.id) {
            console.error("Active tab has no ID.");
            if (cardFrontTextArea) { cardFrontTextArea.placeholder = "Cannot get text."; }
            return;
        }
        if (!chrome.runtime) { console.error("Chrome runtime API not available."); return; }
        chrome.tabs.sendMessage(activeTab.id, { action: "GET_SELECTED_TEXT" }, (response?: { selectedText?: string }) => {
            if (chrome.runtime.lastError) { console.warn("Error sending message (content script connection):", chrome.runtime.lastError.message); return; }

            // Re-fetch the element reference INSIDE the callback for safety
            const localCardFrontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
            if (!localCardFrontTextArea) {
                console.error("cardFrontTextArea element not found inside sendMessage callback!");
                return;
            }

            if (response && typeof response.selectedText === 'string') {
                localCardFrontTextArea.value = response.selectedText;
                console.log("Updated textarea with selected text.");
            } else {
                if (!localCardFrontTextArea.value) { localCardFrontTextArea.placeholder = "No text selected on page."; }
            }
        });
    });
}

/**
 * Handles the click event for the "Show Answer" button.
 * Assumes reviewBackElement and showAnswerButton exist.
 */
function handleShowAnswerClick() {
    console.log("Show Answer button clicked.");
    if (currentCard && reviewBackElement && showAnswerButton) {
        reviewBackElement.textContent = currentCard.back;
        reviewBackElement.style.display = 'block';
        showAnswerButton.disabled = true;
        console.log(`Showing answer for card: "${currentCard.front}"`);
    } else {
        console.warn("Cannot show answer: No current card or UI elements missing.");
    }
}


/**
 * Handles the logic when the Save Card button is clicked.
 * Assumes cardFrontTextArea, cardBackTextArea, saveStatusMessageElement, saveButtonElement exist.
 */
function handleSaveCardClick() {
    if (!cardFrontTextArea || !cardBackTextArea || !saveStatusMessageElement || !saveButtonElement) {
        console.error("Save card UI elements not found!"); return;
    }
    const frontText = cardFrontTextArea.value.trim();
    const backText = cardBackTextArea.value.trim();
    if (frontText === "" || backText === "") {
        saveStatusMessageElement.textContent = "Error: Both Front and Back fields are required.";
        saveStatusMessageElement.style.color = "red";
        console.warn("Save attempt failed: Empty fields.");
        return;
    }
    saveButtonElement.disabled = true; saveButtonElement.textContent = "Saving...";
    try {
        const newCard = new Card(frontText, backText);
        deck.addCard(newCard);
        saveStatusMessageElement.textContent = "Card saved successfully!";
        saveStatusMessageElement.style.color = "green";
        console.log(`Card added. Deck size: ${deck.size()}`);
        cardBackTextArea.value = ""; // Clear back input
        // If no card was being reviewed, display the newly added one
        if (!currentCard && deck.size() > 0) {
             console.log("Displaying newly added card for review.");
             displayCardForReview();
        }
    } catch (error) {
        saveStatusMessageElement.textContent = "Error: Could not save card.";
        saveStatusMessageElement.style.color = "red";
        console.error("Error saving card:", error);
    } finally {
        setTimeout(() => { if (saveButtonElement) { saveButtonElement.disabled = false; saveButtonElement.textContent = "Save Card"; } }, 500);
    }
}

/**
 * Initializes the popup application.
 */
async function initializeApp() {
    console.log("Initializing app...");

    // Get ALL DOM element references ONCE
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
    canvasElement = document.getElementById("hidden-canvas") as HTMLCanvasElement | null; // Get canvas

    // Critical Element Check (Including Canvas)
    if (!tfStatusElement || !cardFrontTextArea || !cardBackTextArea || !saveButtonElement || !saveStatusMessageElement || !reviewFrontElement || !reviewBackElement || !showAnswerButton || !gestureStatusElement || !canvasElement || !videoElement /* Check videoElement too */) {
        console.error("FATAL: Critical UI elements missing. Cannot initialize further.");
        document.body.innerHTML = "<h1>Critical Error: UI elements missing. Please check popup.html.</h1>";
        return; // Stop initialization
    }

    // Get canvas context
    canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) {
        console.error("FATAL: Could not get 2D context from canvas.");
        tfStatusElement.textContent = "Error: Canvas context failed.";
        return;
    }


    fetchSelectedText(); // Get selected text early
    gestureRecognizerInstance = new GestureRecognizer(); // Create recognizer instance

    const webcamReady = await setupWebcam(); // Attempt webcam setup

    if (webcamReady) {
        console.log("Webcam ready, proceeding to load model...");
        handPoseModel = await loadHandPoseModel(); // Attempt model load

        if (handPoseModel && gestureRecognizerInstance) {
            tfStatusElement.textContent = "Ready for hand detection.";
            displayCardForReview(); // Show the first card
            console.log(">>> Starting detection loop NOW!");
            isDetecting = true;
            // Delay starting the loop slightly (optional, keep if needed)
            setTimeout(() => {
                if (isDetecting) { detectHandsLoop(); }
            }, 500);
        } else {
            console.error("Model or Gesture Recognizer loading failed. Hand pose detection cannot proceed.");
            tfStatusElement.textContent = "Error: Model load failed.";
            displayCardForReview();
        }
    } else {
        console.error("Webcam setup failed. Hand pose detection cannot proceed.");
        displayCardForReview();
    }

    // Setup Save Button Listener
    saveButtonElement.addEventListener('click', handleSaveCardClick);

    // Setup Show Answer Button Listener
    showAnswerButton.addEventListener('click', handleShowAnswerClick);
    console.log("Show Answer button listener attached.");
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializeApp);

// Stop detection loop when popup closes
window.addEventListener('unload', () => {
    isDetecting = false;
    console.log("Popup closing, stopping detection loop.");
});


console.log("Popup script loaded (ts).");

