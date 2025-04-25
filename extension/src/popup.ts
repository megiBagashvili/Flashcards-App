// extension/src/popup.ts
import { Deck } from './Deck'; // Import the Deck class
import { Card } from './Card';   // Import the Card class

// Import TensorFlow.js and Hand Pose Detection model
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
// Import the specific model configuration type
import { MediaPipeHandsTfjsModelConfig } from '@tensorflow-models/hand-pose-detection';


// --- Global Variables ---
// Store references to key elements and the model once loaded
let videoElement: HTMLVideoElement | null = null;
let tfStatusElement: HTMLElement | null = null;
// Variable to store the loaded hand pose detection model
let handPoseModel: handPoseDetection.HandDetector | null = null;

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
        // Request access to the webcam
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true, // We only need video
            audio: false // No audio needed
        });

        // Webcam access granted
        tfStatusElement.textContent = "Webcam access granted. Starting stream...";
        console.log("Webcam access granted.");

        // Connect the stream to the video element
        videoElement.srcObject = stream;

        // Wait for the video metadata to load to get dimensions etc.
        await new Promise<void>((resolve) => {
            videoElement?.addEventListener('loadedmetadata', () => {
                 console.log("Video metadata loaded.");
                 resolve();
            }, { once: true });
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
        // Handle errors
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
        return false; // Indicate failure
    }
}

/**
 * Loads the Hand Pose Detection model.
 * @returns {Promise<handPoseDetection.HandDetector | null>} The loaded model or null if loading failed.
 */
async function loadHandPoseModel(): Promise<handPoseDetection.HandDetector | null> {
    // Ensure tfStatusElement is available
    if (!tfStatusElement) {
        console.error("TF Status element not found during model load!");
        return null;
    }

    tfStatusElement.textContent = "Loading hand pose model (MediaPipe)...";
    console.log("Loading hand pose model...");

    try {
        // Define model configuration
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: MediaPipeHandsTfjsModelConfig = {
            runtime: 'tfjs', // Use TensorFlow.js runtime
            modelType: 'lite', // Use 'lite' or 'full' - 'lite' is faster
            maxHands: 1        // Detect only one hand for simplicity
        };

        // Create the detector (loads the model)
        const detector = await handPoseDetection.createDetector(model, detectorConfig);

        console.log("Hand pose model loaded successfully.");
        tfStatusElement.textContent = "Model loaded."; // Update status on success
        return detector; // Return the loaded model

    } catch (error) {
        console.error("Error loading hand pose model:", error);
        // Update status element with error message
        tfStatusElement.textContent = "Error loading model. Please try reloading.";
        return null; // Indicate failure by returning null
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
    const webcamReady = await setupWebcam();

    // If webcam setup is successful, proceed to load the model
    if (webcamReady && tfStatusElement) { // Also check if tfStatusElement is available
        console.log("Webcam ready, proceeding to load model...");
        // Load the model and store it in the global variable
        handPoseModel = await loadHandPoseModel(); // Call the load function

        // Check if model loading was successful
        if (handPoseModel) {
            tfStatusElement.textContent = "Ready for hand detection."; // Final ready status
            // Placeholder for next step P2-C2:
            // console.log("Starting detection loop...");
            // detectHandsLoop();
        } else {
             // Status should already be updated by loadHandPoseModel() on failure
            console.error("Model loading failed. Hand pose detection cannot proceed.");
        }
    } else {
        console.error("Webcam setup failed. Hand pose detection cannot proceed.");
        // Status should already be updated by setupWebcam() on failure
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
