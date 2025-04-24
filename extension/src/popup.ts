// extension/src/popup.ts
import { Deck } from './Deck.js'; // <-- Added .js extension
import { Card } from './Card.js';   // <-- Added .js extension

// --- Instantiate the Deck ---
// Create one Deck instance for the lifetime of the popup window.
const deck = new Deck();
console.log("Deck instance created:", deck);
// --------------------------

/**
 * Fetches the selected text from the active tab and populates the front textarea.
 */
function fetchSelectedText() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length === 0 || !tabs[0]) {
            console.error("No active tab found.");
            return;
        }
        const activeTab = tabs[0];

        if (!activeTab.id) {
            console.error("Active tab has no ID.");
            const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
            if (frontTextArea) {
                frontTextArea.placeholder = "Cannot get text from this page.";
            }
            return;
        }

        console.log(`Sending message to tab ${activeTab.id}`);

        chrome.tabs.sendMessage(
            activeTab.id,
            { action: "GET_SELECTED_TEXT" },
            (response?: { selectedText?: string }) => {
                // Check for runtime errors when sending the message
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                    if (frontTextArea) {
                        frontTextArea.placeholder = `Error: ${chrome.runtime.lastError.message}. Try reloading the page?`;
                    }
                    return;
                }

                // Process the response if no error occurred
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
                    if (frontTextArea) {
                        if (!frontTextArea.value) {
                            frontTextArea.placeholder = "No text selected on page.";
                        }
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
    // Get references to the UI elements
    const frontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
    const backTextArea = document.getElementById("card-back") as HTMLTextAreaElement | null;
    const statusMessageElement = document.getElementById("status-message") as HTMLElement | null;
    const saveButton = document.getElementById("save-card") as HTMLButtonElement | null; // Get button reference

    // Ensure all elements exist
    if (!frontTextArea || !backTextArea || !statusMessageElement || !saveButton) {
        console.error("One or more UI elements not found!");
        if (statusMessageElement) {
            statusMessageElement.textContent = "Error: UI elements missing.";
            statusMessageElement.style.color = "red";
        }
        return;
    }

    // Get text and trim whitespace
    const frontText = frontTextArea.value.trim();
    const backText = backTextArea.value.trim();

    // Validate input
    if (frontText === "" || backText === "") {
        statusMessageElement.textContent = "Error: Both Front and Back fields are required.";
        statusMessageElement.style.color = "red";
        console.warn("Save attempt failed: Empty fields.");
        return;
    }

    // Disable button temporarily to prevent double clicks
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        // Create a new Card instance
        const newCard = new Card(frontText, backText); // Assuming Card constructor takes (front, back)

        // Add the card to the deck
        deck.addCard(newCard);

        // Provide success feedback
        statusMessageElement.textContent = "Card saved successfully!";
        statusMessageElement.style.color = "green";
        console.log(`Card added. Deck size: ${deck.size()}`);
        console.log("Current deck contents:", deck.getCards()); // Log deck contents for debugging

        // Optionally clear the back textarea after successful save
        backTextArea.value = "";
        // Optionally focus back on the back textarea for quick next entry
        // backTextArea.focus();

    } catch (error) {
        // Handle potential errors during Card creation or adding
        statusMessageElement.textContent = "Error: Could not save card.";
        statusMessageElement.style.color = "red";
        console.error("Error saving card:", error);
    } finally {
         // Re-enable the button after a short delay, regardless of success/failure
         setTimeout(() => {
            if (saveButton) { // Check again in case popup closed
                saveButton.disabled = false;
                saveButton.textContent = "Save Card";
            }
         }, 500); // 500ms delay
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Fetch selected text when popup opens
    fetchSelectedText();

    // Get reference to the save button
    const saveButton = document.getElementById("save-card") as HTMLButtonElement | null;

    // Add click listener to the save button
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveCardClick);
    } else {
        console.error("Save button element not found on DOMContentLoaded!");
        // Optionally display an error in the status message area here as well
        const statusMessageElement = document.getElementById("status-message") as HTMLElement | null;
        if (statusMessageElement) {
             statusMessageElement.textContent = "Error: Save button missing.";
             statusMessageElement.style.color = "red";
        }
    }
});

console.log("Popup script loaded (ts).");

