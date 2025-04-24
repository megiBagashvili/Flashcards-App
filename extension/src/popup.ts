import { Card } from './Card';
import { Deck } from './Deck';

function fetchSelectedText() {
  // Use chrome.tabs specific types if needed, but 'any' often works for callbacks
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs.length === 0 || !tabs[0]) { // Added check for tabs[0] existence
          console.error("No active tab found.");
          return;
      }
      const activeTab = tabs[0];

      if (!activeTab.id) {
          console.error("Active tab has no ID.");
          // Type assertion for the textarea
          const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
          if (frontTextArea) {
              // Now TS knows frontTextArea can have a 'placeholder' property
              frontTextArea.placeholder = "Cannot get text from this page.";
          }
          return;
      }

      console.log(`Sending message to tab ${activeTab.id}`);

      chrome.tabs.sendMessage(
          activeTab.id,
          { action: "GET_SELECTED_TEXT" },
          // Define the expected response type for clarity
          (response?: { selectedText?: string }) => { // Optional response and property

              // Use chrome.runtime specific types
              if (chrome.runtime.lastError) {
                  console.error("Error sending message:", chrome.runtime.lastError.message);
                  const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                  if (frontTextArea) {
                      frontTextArea.placeholder = `Error: ${chrome.runtime.lastError.message}. Try reloading the page?`;
                  }
                  return;
              }

              // Check response and selectedText more carefully
              if (response && typeof response.selectedText === 'string') { // Check type too
                  console.log("Received response:", response);
                  // Type assertion for the textarea
                  const frontTextArea = document.getElementById("card-front") as HTMLTextAreaElement | null;
                  if (frontTextArea) {
                      // Now TS knows frontTextArea can have a 'value' property
                      frontTextArea.value = response.selectedText;
                      console.log("Updated textarea with:", response.selectedText);
                  } else {
                      console.error("Textarea element 'card-front' not found.");
                  }
              } else {
                  console.warn("Received no response or invalid response format from content script.");
                  const frontTextArea = document.getElementById('card-front') as HTMLTextAreaElement | null;
                  if (frontTextArea) {
                      // Check value before setting placeholder
                      if (!frontTextArea.value) {
                          frontTextArea.placeholder = "No text selected on page.";
                      }
                  }
              }
          }
      );
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // This is just for verification, that TypeScript setup ca correctly find and import Card and Deck classes:
  // console.log("Popup DOM loaded. Testing NEW Card/Deck imports...");
  // try {
  //     const testCard = new Card("Test Front", "Test Back");
  //     const testDeck = new Deck();
  //     testDeck.addCard(testCard);
  //     console.log("NEW Card and Deck imported and instantiated successfully.", testDeck);
  // } catch (error) {
  //     console.error("Error testing NEW Card/Deck import:", error);
  // }

  fetchSelectedText();
});
