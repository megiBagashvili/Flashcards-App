import { Deck } from './Deck';
import { Card } from './Card';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { MediaPipeHandsTfjsModelConfig } from '@tensorflow-models/hand-pose-detection';

let videoElement: HTMLVideoElement | null = null;
let tfStatusElement: HTMLElement | null = null;
let handPoseModel: handPoseDetection.HandDetector | null = null;

const deck = new Deck();
console.log("Deck instance created:", deck);

/**
 * Sets up the webcam feed. Requests permission and streams video if granted.
 * @returns {Promise<boolean>} True if setup was successful, false otherwise.
 */
async function setupWebcam(): Promise<boolean> {
    videoElement = document.getElementById("webcam-feed") as HTMLVideoElement | null;
    tfStatusElement = document.getElementById("tf-status") as HTMLElement | null;

    if (!videoElement || !tfStatusElement) {
        console.error("Webcam video or TF status element not found!");
        if(tfStatusElement) tfStatusElement.textContent = "Error: UI elements missing.";
        return false;
    }

    tfStatusElement.textContent = "Requesting webcam access...";
    console.log("Requesting webcam access...");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        tfStatusElement.textContent = "Webcam access granted. Starting stream...";
        console.log("Webcam access granted.");
        videoElement.srcObject = stream;
        await new Promise<void>((resolve) => {
            videoElement?.addEventListener('loadedmetadata', () => {
                 console.log("Video metadata loaded.");
                 resolve();
            }, { once: true });
        });

        const webcamContainer = document.getElementById("webcam-container");
        if (webcamContainer) {
            webcamContainer.style.backgroundColor = 'transparent';
        }
        if(videoElement) videoElement.style.display = 'block';

        tfStatusElement.textContent = "Webcam ready.";
        console.log("Webcam setup successful.");
        return true;

    } catch (error) {
        console.error("Error accessing webcam:", error);
        let errorMessage = "Error accessing webcam.";
        if (error instanceof Error) {
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                errorMessage = "Webcam permission denied. Please grant access in browser settings.";
            } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                errorMessage = "No webcam found. Please ensure a camera is connected and enabled.";
            } else {
                 errorMessage = `Webcam Error: ${error.message}`;
            }
        }
        if (tfStatusElement) {
            tfStatusElement.textContent = errorMessage;
        }
        return false;
    }
}

/**
 * Loads the Hand Pose Detection model.
 * @returns {Promise<handPoseDetection.HandDetector | null>} The loaded model or null if loading failed.
 */
async function loadHandPoseModel(): Promise<handPoseDetection.HandDetector | null> {
    if (!tfStatusElement) {
        console.error("TF Status element not found during model load!");
        return null;
    }

    // Optional: Wait for TF backend to be ready (usually not needed if imported)
    // await tf.ready();
    // console.log("TF Backend Ready:", tf.getBackend()); // Log the backend being used

    tfStatusElement.textContent = "Loading hand pose model (MediaPipe)...";
    console.log("Loading hand pose model...");

    try {
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: MediaPipeHandsTfjsModelConfig = {
            runtime: 'tfjs',
            modelType: 'lite',
            maxHands: 1
        };

        const detector = await handPoseDetection.createDetector(model, detectorConfig);

        console.log("Hand pose model loaded successfully.");
        tfStatusElement.textContent = "Model loaded.";
        return detector;

    } catch (error) {
        console.error("Error loading hand pose model:", error);
        tfStatusElement.textContent = "Error loading model. Please try reloading.";
        return null;
    }
}


/**
 * Fetches the selected text from the active tab and populates the front textarea.
 */
function fetchSelectedText() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
        console.error("Chrome tabs API not available.");
        return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length === 0 || !tabs[0]) {
            console.error("No active tab found.");
            return;
        }
        const activeTab = tabs[0];
        if (!activeTab.id) {
            console.error("Active tab has no ID.");
            const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
            if (frontTextArea) frontTextArea.placeholder = "Cannot get text from this page.";
            return;
        }
        console.log(`Sending message to tab ${activeTab.id}`);
        if (!chrome.runtime) {
            console.error("Chrome runtime API not available.");
            return;
        }
        chrome.tabs.sendMessage(
            activeTab.id,
            { action: "GET_SELECTED_TEXT" },
            (response?: { selectedText?: string }) => {
                if (chrome.runtime.lastError) {
                    console.warn("Error sending message (content script connection):", chrome.runtime.lastError.message);
                    const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                    if (frontTextArea) frontTextArea.placeholder = `Error: ${chrome.runtime.lastError.message}. Try reloading the page?`;
                    return;
                }
                if (response && typeof response.selectedText === 'string') {
                    console.log("Received response:", response);
                    const frontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
                    if (frontTextArea) {
                        frontTextArea.value = response.selectedText;
                        console.log("Updated textarea with:", response.selectedText);
                    } else {
                        console.error("Textarea element 'card-front' not found.");
                    }
                } else {
                    console.warn("Received no response or invalid response format from content script.");
                    const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                    if (frontTextArea && !frontTextArea.value) {
                         frontTextArea.placeholder = "No text selected on page.";
                    }
                }
            }
        );
    });
}

/**
 * Handles the logic when the Save Card button is clicked.
 */
function handleSaveCardClick() {
    const frontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
    const backTextArea = document.getElementById("card-back") as HTMLTextAreaElement | null;
    const statusMessageElement = document.getElementById("status-message") as HTMLElement | null;
    const saveButton = document.getElementById("save-card") as HTMLButtonElement | null;
    if (!frontTextArea || !backTextArea || !statusMessageElement || !saveButton) {
        console.error("One or more UI elements not found!");
        if (statusMessageElement) {
            statusMessageElement.textContent = "Error: UI elements missing.";
            statusMessageElement.style.color = "red";
        }
        return;
    }
    const frontText = frontTextArea.value.trim();
    const backText = backTextArea.value.trim();
    if (frontText === "" || backText === "") {
        statusMessageElement.textContent = "Error: Both Front and Back fields are required.";
        statusMessageElement.style.color = "red";
        console.warn("Save attempt failed: Empty fields.");
        return;
    }
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    try {
        const newCard = new Card(frontText, backText);
        deck.addCard(newCard);
        statusMessageElement.textContent = "Card saved successfully!";
        statusMessageElement.style.color = "green";
        console.log(`Card added. Deck size: ${deck.size()}`);
        console.log("Current deck contents:", deck.getCards());
        backTextArea.value = "";
    } catch (error) {
        statusMessageElement.textContent = "Error: Could not save card.";
        statusMessageElement.style.color = "red";
        console.error("Error saving card:", error);
    } finally {
         setTimeout(() => {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save Card";
            }
         }, 500);
    }
}

/**
 * Initializes the popup application.
 */
async function initializeApp() {
    fetchSelectedText();
    const webcamReady = await setupWebcam();
    if (webcamReady && tfStatusElement) {
        console.log("Webcam ready, proceeding to load model...");
        handPoseModel = await loadHandPoseModel();
        if (handPoseModel) {
            tfStatusElement.textContent = "Ready for hand detection.";
            // Placeholder for next step P2-C2:
            // console.log("Starting detection loop...");
            // detectHandsLoop();
        } else {
            console.error("Model loading failed. Hand pose detection cannot proceed.");
        }
    } else {
        console.error("Webcam setup failed. Hand pose detection cannot proceed.");
    }

    const saveButton = document.getElementById("save-card") as HTMLButtonElement | null;
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveCardClick);
    } else {
        console.error("Save button element not found on DOMContentLoaded!");
        const statusMessageElement = document.getElementById("status-message") as HTMLElement | null;
        if (statusMessageElement) {
             statusMessageElement.textContent = "Error: Save button missing.";
             statusMessageElement.style.color = "red";
        }
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

console.log("Popup script loaded (ts).");

