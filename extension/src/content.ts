/**
 * Content script for Flashcard Quick Capture extension.
 * Listens for messages and responds with selected text.
 */

console.log("Flashcard Quick Capture: Content script loaded.");

chrome.runtime.onMessage.addListener((message: { action?: string }, sender: chrome.runtime.MessageSender, sendResponse: (response?: { selectedText: string }) => void) => {
    console.log("Content script received message:", message);

    if (message.action === "GET_SELECTED_TEXT") {
        const selection = document.getSelection();
        const selectedText = selection?.toString().trim() ?? "";

        console.log("Selected text found:", selectedText);
        sendResponse({ selectedText: selectedText });
        return true;
    }
});