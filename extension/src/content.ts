/**
 * Content script for Flashcard Quick Capture extension.
 * Listens for messages and responds with selected text.
 */

console.log("Flashcard Quick Capture: Content script loaded.");

// Add types for message, sender, and sendResponse parameters
chrome.runtime.onMessage.addListener((message: { action?: string }, sender: chrome.runtime.MessageSender, sendResponse: (response?: { selectedText: string }) => void) => {
    console.log("Content script received message:", message);

    if (message.action === "GET_SELECTED_TEXT") {
        // Handle potential null from getSelection() using optional chaining (?.)
        // and provide a default value using nullish coalescing (??)
        const selection = document.getSelection();
        const selectedText = selection?.toString().trim() ?? ""; // Fixes null error & provides default

        console.log("Selected text found:", selectedText);

        // Send response
        sendResponse({ selectedText: selectedText });

        // Indicate asynchronous response only if truly needed,
        // but here it's synchronous, so returning false or void is fine.
        // However, returning true is harmless if unsure.
        return true;
    }

    // If message is not handled, return false or undefined (void)
    // return false; // uncomment if you want to explicitly signal no async response
});