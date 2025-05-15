/**
 * Content script for Flashcard Quick Capture extension.
 * Listens for messages and responds with selected text.
 */

console.log("Flashcard Quick Capture: Content script loaded.");


/**
 * @function chrome.runtime.onMessage.addListener
 * @description Sets up a listener for messages sent from other parts of the extension
 * @param {function} callback - The function to execute when a message is received.
 * @param {object} message - The message object sent by the caller. Expected to have an action property.
 * @param {chrome.runtime.MessageSender} sender - An object containing information about the script context that sent the message.
 * @param {function} sendResponse - A function to call to send a response back to the message sender. Must be called asynchronously if the listener returns true.
 * @returns {boolean | undefined} Returns true to indicate that the sendResponse callback will be invoked asynchronously after the listener function finishes. This is necessary because document.getSelection is synchronous, but the pattern is good practice.
 *
 * @spec.effects
 * - Listens for runtime messages.
 * - If message.action is "GET_SELECTED_TEXT":
 * - Retrieves the currently selected text on the web page using document.getSelection().
 * - Trims whitespace from the selected text.
 * - Logs the selected text to the console.
 * - Sends a response object { selectedText: string } back to the caller using sendResponse.
 * - If the action doesn't match, the listener does nothing and implicitly returns undefined.
 */
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