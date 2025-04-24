import { Deck } from './Deck';
import { Card } from './Card';

//Instantiating the Deck. Creating one Deck instance for the lifetime of the popup window.
const deck = new Deck();
console.log("Deck instance created:", deck);

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
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                    if (frontTextArea) {
                        frontTextArea.placeholder = `Error: ${chrome.runtime.lastError.message}. Try reloading the page?`;
                    }
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

document.addEventListener('DOMContentLoaded', () => {
    fetchSelectedText();
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
});

console.log("Popup script loaded (ts).");

