// extension/src/popup.ts
import { Deck } from './Deck'; // Import the Deck class
import { Card } from './Card';   // Import the Card class

// Import TensorFlow.js - Needed for subsequent steps
import * as tf from '@tensorflow/tfjs';
// Import handPoseDetection - Needed for subsequent steps
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
// Import specific config type - Needed for subsequent steps
import { MediaPipeHandsTfjsModelConfig } from '@tensorflow-models/hand-pose-detection';


// --- Global Variables ---
// Store references to key elements
let videoElement: HTMLVideoElement | null = null;
let tfStatusElement: HTMLElement | null = null;
// Model variable will be assigned later
// let handPoseModel: handPoseDetection.HandDetector | null = null;

// --- Instantiate the Deck ---
const deck = new Deck();
console.log("Deck instance created:", deck);
// --------------------------

/**
 * Sets up the webcam feed. Requests permission and streams video if granted.
 * @returns {Promise<boolean>} True if setup was successful, false otherwise.
 */
async function setupWebcam(): Promise<boolean> {
    // Get references to the HTML elements
    videoElement = document.getElementById("webcam-feed") as HTMLVideoElement | null;
    tfStatusElement = document.getElementById("tf-status") as HTMLElement | null;

    if (!videoElement || !tfStatusElement) {
        console.error("Webcam video or TF status element not found!");
        if(tfStatusElement) tfStatusElement.textContent = "Error: UI elements missing.";
        return false; // Indicate failure
    }

    tfStatusElement.textContent = "Requesting webcam access...";
    console.log("Requesting webcam access...");

    try {
        // Request access to the webcam using the browser API
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true, // We only need video
            audio: false // No audio needed
        });

        // --- Success Case ---
        tfStatusElement.textContent = "Webcam access granted. Starting stream...";
        console.log("Webcam access granted.");

        // Connect the stream to the video element
        videoElement.srcObject = stream;

        // Wait for the video metadata to load (important for dimensions/readiness)
        await new Promise<void>((resolve) => { // Changed resolve type to void
            // Use optional chaining in case videoElement becomes null unexpectedly
            videoElement?.addEventListener('loadedmetadata', () => {
                 console.log("Video metadata loaded.");
                 resolve(); // Resolve the promise without a value
            }, { once: true }); // Ensure listener runs only once
        });

        // Optional: Hide placeholder background now that video might be ready
        const webcamContainer = document.getElementById("webcam-container");
        if (webcamContainer) {
            webcamContainer.style.backgroundColor = 'transparent';
        }
        // Make sure video is visible if it was hidden initially
        if(videoElement) videoElement.style.display = 'block';

        tfStatusElement.textContent = "Webcam ready."; // Update status
        console.log("Webcam setup successful.");
        return true; // Indicate success

    } catch (error) {
        // --- Failure Case ---
        console.error("Error accessing webcam:", error);
        let errorMessage = "Error accessing webcam.";
        // Check the specific type of error
        if (error instanceof Error) {
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                errorMessage = "Webcam permission denied. Please grant access in browser settings.";
            } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
                errorMessage = "No webcam found. Please ensure a camera is connected and enabled.";
            } else {
                 errorMessage = `Webcam Error: ${error.message}`;
            }
        }
        // Display error message in the status element
        if (tfStatusElement) {
            tfStatusElement.textContent = errorMessage;
        }
        return false; // Indicate failure
    }
}

// --- fetchSelectedText function (Keep existing code) ---
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
                    console.error("Error sending message:", chrome.runtime.lastError.message);
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

// --- handleSaveCardClick function (Keep existing code) ---
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
    // Fetch selected text when popup opens
    fetchSelectedText();

    // Setup webcam (asynchronously)
    const webcamReady = await setupWebcam(); // Call the new function

    // If webcam setup is successful, proceed to load the model (in the next step)
    if (webcamReady) {
        console.log("Webcam ready, proceed to load model...");
        // Placeholder for next step P2-C1-S4:
        // handPoseModel = await loadHandPoseModel();
        // if (handPoseModel) { ... }
    } else {
        console.error("Webcam setup failed. Hand pose detection cannot proceed.");
        // Status should already be updated by setupWebcam()
    }

    // --- Setup Save Button Listener (Existing) ---
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


// --- Event Listeners ---
// Start the initialization process when the popup DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

console.log("Popup script loaded (ts).");
