import { Card } from './Card';
import { GestureRecognizer, Gesture } from './srs/GestureRecognizer';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsTfjsModelConfig, Keypoint } from '@tensorflow-models/hand-pose-detection';

const REQUIRED_CONFIDENCE = 5;
const REVIEW_ACTION_DELAY_MS = 1500; 
const API_BASE_URL = 'http://localhost:3001/api'; 

type BackendCardType = {
    id: number;
    front: string;
    back: string;
    hint?: string | null;
    tags?: string[] | null;
    due_date?: string; 
};

enum AnswerDifficulty { Wrong = 0, Hard = 1, Easy = 2 }

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

function startDetectionLoop() {
    if (!isDetecting && handPoseModel && gestureRecognizerInstance && videoElement && videoElement.readyState >= 3) {
        console.log("Starting detection loop..."); isDetecting = true; detectHandsLoop();
    } else if (isDetecting) { console.log("Detection loop already running."); }
    else { console.warn("Cannot start detection loop: Model, Recognizer, or Video not ready."); if (gestureStatusElement) gestureStatusElement.textContent = "Setup incomplete..."; }
}

function stopDetectionLoop() {
    if (isDetecting) { console.log("Stopping detection loop."); isDetecting = false; if (gestureStatusElement) { gestureStatusElement.textContent = "Detection Paused / Idle"; } }
}

async function detectHandsLoop() {
    if (!isDetecting) { console.log("isDetecting is false, loop stopping."); return; }
    if (!handPoseModel || !videoElement || !gestureRecognizerInstance || !canvasElement || !canvasCtx || videoElement.readyState < 3 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) { console.warn("Detection loop waiting for readiness..."); requestAnimationFrame(detectHandsLoop); return; }

    let currentFrameGesture: Gesture = Gesture.Unknown;
    try {
        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) { console.log("Resizing canvas to match video dimensions."); canvasElement.width = videoElement.videoWidth; canvasElement.height = videoElement.videoHeight; }
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        const hands = await handPoseModel.estimateHands(canvasElement, { flipHorizontal: false });
        if (hands.length > 0 && hands[0]?.keypoints) {
            const landmarks = hands[0].keypoints;
            if (isNaN(landmarks[0]?.x) || isNaN(landmarks[0]?.y)) { currentFrameGesture = Gesture.Unknown; }
            else { currentFrameGesture = gestureRecognizerInstance.recognizeGesture(landmarks); }
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
                console.log(`Mapping ${confidentGesture} to difficulty ${AnswerDifficulty[reviewResult]} for card "${currentDisplayedCard.front}"`);

                console.warn(`P3-C4-S3: Backend update via fetch not implemented yet for card ID: ${currentDisplayedCard.id}`);

                currentPracticeIndex++;
                displayCardForReview();

                currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown;
                isDetecting = false;
                console.log(`Pausing detection for ${REVIEW_ACTION_DELAY_MS}ms...`);
                if (gestureStatusElement) gestureStatusElement.textContent = `Action: ${confidentGesture}! Paused...`;
                setTimeout(() => { if (document.visibilityState === 'visible' && !isDetecting) { console.log("Resuming detection loop after delay."); startDetectionLoop(); } else { console.log("Skipping detection resumption."); } }, REVIEW_ACTION_DELAY_MS);
                return;
            } else { currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown; }
        } else { console.log(`Confident gesture detected, but no card currently being reviewed.`); currentGestureConfidence = 0; lastDetectedGesture = Gesture.Unknown; }
    }

    if (!actionTaken && gestureStatusElement) {
         const displayGesture = (currentGestureConfidence > 0) ? lastDetectedGesture : Gesture.Unknown;
         const confidenceText = currentGestureConfidence > 0 ? ` (${currentGestureConfidence})` : '';
         gestureStatusElement.textContent = `Gesture: ${displayGesture}${confidenceText}`;
    }

    if (!actionTaken) { requestAnimationFrame(detectHandsLoop); }
}

/**
 * Fetches practice cards from the backend and displays the next card for review,
 * or handles the case where no cards are available. (P3-C4-S2 Implemented)
 */
async function displayCardForReview() {
    console.log("Attempting to display card for review...");
    if (!reviewFrontElement || !reviewBackElement || !showAnswerButton || !gestureStatusElement || !reviewContainerElement || !noCardsMessageElement) { console.error("DisplayCard called but critical review UI elements are missing!"); return; }

    reviewContainerElement.style.display = 'none'; noCardsMessageElement.style.display = 'none';
    reviewBackElement.textContent = '???'; reviewBackElement.style.display = 'block';
    showAnswerButton.style.display = 'block'; showAnswerButton.disabled = true;
    gestureStatusElement.textContent = 'Initializing...'; currentDisplayedCard = null;

    if (currentPracticeIndex >= currentPracticeCards.length) {
        console.log("Fetching new practice session from API..."); if (gestureStatusElement) gestureStatusElement.textContent = 'Loading cards...';
        try {
            const response = await fetch(`${API_BASE_URL}/practice`);
            if (!response.ok) { let errorMsg = `API Error: ${response.status} ${response.statusText}`; try { const errData = await response.json(); errorMsg = errData?.error || errData?.message || errorMsg; } catch(e){} throw new Error(errorMsg); }
            const sessionData = await response.json();
            if (!sessionData || !Array.isArray(sessionData.cards) || typeof sessionData.day !== 'number') { throw new Error("Invalid data format received from API."); }
            currentPracticeCards = sessionData.cards; currentPracticeDay = sessionData.day; currentPracticeIndex = 0;
            console.log(`Fetched ${currentPracticeCards.length} cards for day ${currentPracticeDay}`);
        } catch (error: any) {
            console.error("Failed to fetch practice cards:", error);
            if (gestureStatusElement) gestureStatusElement.textContent = `Error loading cards: ${error.message}`;
            currentPracticeCards = []; currentPracticeIndex = 0;
             if (noCardsMessageElement) { noCardsMessageElement.textContent = `Error loading cards. Is the backend running at ${API_BASE_URL}?`; noCardsMessageElement.style.display = 'block'; }
            stopDetectionLoop(); return;
        }
    }

    if (currentPracticeCards.length > 0 && currentPracticeIndex < currentPracticeCards.length) {
        currentDisplayedCard = currentPracticeCards[currentPracticeIndex];
        reviewContainerElement.style.display = 'block'; noCardsMessageElement.style.display = 'none';
        if (reviewFrontElement) reviewFrontElement.textContent = currentDisplayedCard.front;
        if (reviewBackElement) { reviewBackElement.textContent = '???'; reviewBackElement.style.display = 'block'; }
        if (showAnswerButton) { showAnswerButton.style.display = 'block'; showAnswerButton.disabled = false; }
        if (gestureStatusElement) { gestureStatusElement.textContent = `Card ${currentPracticeIndex + 1} of ${currentPracticeCards.length}. Day ${currentPracticeDay}. Gesture: Unknown`; }
        console.log(`Displaying card ID ${currentDisplayedCard.id} for review: "${currentDisplayedCard.front}"`);
        startDetectionLoop();
    } else {
        currentDisplayedCard = null; console.log("No cards due for practice.");
        reviewContainerElement.style.display = 'none';
        if (noCardsMessageElement) { noCardsMessageElement.textContent = `No cards due for practice on Day ${currentPracticeDay}. Try creating more cards or advancing the day!`; noCardsMessageElement.style.display = 'block'; }
        if (gestureStatusElement) gestureStatusElement.textContent = "Session complete!";
        if (showAnswerButton) showAnswerButton.style.display = 'none';
        stopDetectionLoop();
    }
    lastDetectedGesture = Gesture.Unknown; currentGestureConfidence = 0;
}


function fetchSelectedText() {
    if (!cardFrontTextArea) { console.error("Cannot fetch text, front text area element not found initially."); return; }
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.runtime) { console.warn("Chrome APIs not available. Skipping text fetch."); cardFrontTextArea.placeholder = "Cannot fetch text (not an extension?)."; return; }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (chrome.runtime.lastError) { console.error("Error querying tabs:", chrome.runtime.lastError.message); return; }
        if (tabs.length === 0 || !tabs[0]) { console.error("No active tab found."); return; }
        const activeTab = tabs[0];
        if (!activeTab.id || activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('edge://')) { console.warn(`Cannot send message to restricted tab: ${activeTab.url}`); if (cardFrontTextArea) cardFrontTextArea.placeholder = "Cannot get text from this page."; return; }

        console.log(`Sending message to tab ${activeTab.id}`);
        chrome.tabs.sendMessage(
            activeTab.id, { action: "GET_SELECTED_TEXT" },
            (response?: { selectedText?: string }) => {
                if (chrome.runtime.lastError) { console.warn("Error receiving message response:", chrome.runtime.lastError.message); const el = document.getElementById("card-front") as HTMLTextAreaElement | null; if (el && !el.value) el.placeholder = "Couldn't connect to page."; return; }
                const localCardFrontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
                if (!localCardFrontTextArea) { console.error("cardFrontTextArea element not found inside sendMessage callback!"); return; }
                if (response && typeof response.selectedText === 'string') { localCardFrontTextArea.value = response.selectedText; console.log("Updated textarea with selected text:", response.selectedText); }
                else { console.log("No text selected or invalid response received."); if (!localCardFrontTextArea.value) { localCardFrontTextArea.placeholder = "No text selected on page."; } }
            }
        );
    });
}

function handleShowAnswerClick() {
    console.log("Show Answer button clicked.");
    if (currentDisplayedCard && reviewBackElement && showAnswerButton) {
        reviewBackElement.textContent = currentDisplayedCard.back;
        reviewBackElement.style.display = 'block';
        showAnswerButton.disabled = true; showAnswerButton.style.display = 'none';
        console.log(`Showing answer for card ID ${currentDisplayedCard.id}: "${currentDisplayedCard.front}"`);
    } else { console.warn("Cannot show answer: No current card or UI elements missing."); }
}

async function handleSaveCardClick() {
    if (!cardFrontTextArea || !cardBackTextArea || !saveStatusMessageElement || !saveButtonElement) { console.error("Save card UI elements not found!"); return; }
    const frontText = cardFrontTextArea.value.trim(); const backText = cardBackTextArea.value.trim();
    if (frontText === "" || backText === "") { saveStatusMessageElement.textContent = "Error: Both Front and Back fields are required."; saveStatusMessageElement.style.color = "red"; console.warn("Save attempt failed: Empty fields."); return; }

    saveButtonElement.disabled = true; saveButtonElement.textContent = "Saving...";
    saveStatusMessageElement.textContent = "Saving to server..."; saveStatusMessageElement.style.color = "orange";

    try {
        const cardData = { front: frontText, back: backText, }; // Add hint/tags if UI exists
        console.log(`Sending card data to API:`, cardData);
        const response = await fetch(`${API_BASE_URL}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(cardData), });

        if (response.ok && response.status === 201) {
            const createdCard: BackendCardType = await response.json(); // Use Type Alias
            saveStatusMessageElement.textContent = "Card saved successfully!"; saveStatusMessageElement.style.color = "green";
            console.log(`Card saved via API. ID: ${createdCard.id}`);
            cardBackTextArea.value = "";
            setTimeout(() => { if (saveStatusMessageElement) saveStatusMessageElement.textContent = ""; }, 3000);
        } else {
            let errorMsg = `Error: ${response.status} ${response.statusText}`; try { const errorData = await response.json(); errorMsg = errorData?.error || errorData?.message || errorMsg; } catch (e) { }
            saveStatusMessageElement.textContent = `Error saving card: ${errorMsg}`; saveStatusMessageElement.style.color = "red";
            console.error("Error saving card via API:", response.status, response.statusText, errorMsg);
        }
    } catch (error) {
        saveStatusMessageElement.textContent = "Error: Could not connect to server."; saveStatusMessageElement.style.color = "red";
        console.error("Network error saving card:", error);
    } finally { saveButtonElement.disabled = false; saveButtonElement.textContent = "Save Card"; }
}

async function initializeApp() {
    console.log("Initializing app...");
    videoElement = document.getElementById("webcam-feed") as HTMLVideoElement | null;
    tfStatusElement = document.getElementById("tf-status") as HTMLElement | null;
    reviewFrontElement = document.getElementById("review-front") as HTMLElement | null;
    reviewBackElement = document.getElementById("review-back") as HTMLElement | null;
    showAnswerButton = document.getElementById("show-answer") as HTMLButtonElement | null; // Check ID in HTML!
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
        if (handPoseModel && gestureRecognizerInstance) { tfStatusElement!.textContent = "Model ready."; displayCardForReview(); }
        else { console.error("Model/Recognizer load failed."); tfStatusElement!.textContent = "Error: Model load failed."; displayCardForReview(); }
    } else { console.error("Webcam setup failed."); tfStatusElement!.textContent = "Webcam setup failed."; displayCardForReview(); }

    saveButtonElement!.addEventListener('click', handleSaveCardClick);
    showAnswerButton!.addEventListener('click', handleShowAnswerClick);

    console.log("Initialization sequence complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('unload', () => { stopDetectionLoop(); console.log("Popup closing, detection loop stopped."); });

console.log("Popup script loaded (ts).");