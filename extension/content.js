/**
 *
 *
 * This script runs in the context of the web page.
 * It listens for messages from other parts of the extension (like the popup)
 * and responds with requested information, such as the currently selected text.
 */

console.log("Flashcard Quick Capture: Content script loaded.");

// Listen for messages from the runtime (e.g., popup.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  // Check if the message is asking for the selected text
  if (message.action === "GET_SELECTED_TEXT") {
    // Get the currently selected text on the page
    const selectedText = document.getSelection().toString().trim();
    console.log("Selected text found:", selectedText);

    // Send the selected text back to the sender (popup.js)
    // The response is an object containing the selected text.
    sendResponse({ selectedText: selectedText });
  }

  // Return true to indicate that sendResponse will be called asynchronously
  // (Although in this simple case it's synchronous, it's good practice
  // for more complex message handlers that might involve async operations).
  // If you don't return true for async responses, the message channel might close prematurely.
  return true;
});
