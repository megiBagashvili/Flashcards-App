/**
 * @file frontend/answer-display/script.js
 * @description Client-side JavaScript for the answer display page.
 * This script fetches the latest submitted answer from the backend API
 * and displays it on the page.
 */

console.log("Answer Display Page: script.js loaded.");

/**
 * @event DOMContentLoaded
 * @description Executes when the initial HTML document has been completely loaded and parsed,
 * without waiting for stylesheets, images, and subframes to finish loading.
 * This is the entry point for fetching and displaying the data.
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * @const {HTMLElement | null} answerSpan
     * @description The HTML <span> element where the fetched data will be displayed.
     * Its `id` is "answer".
     */
    const answerSpan = document.getElementById('answer');

    /**
     * @const {string} apiUrl
     * @description The URL of the backend API endpoint to fetch the latest answer.
     * This will point to the local backend during development and will need to be
     * updated to the live EC2 public IP address during deployment.
     */
    const apiUrl = 'http://13.48.195.184:3001/api/get-latest-answer';

    if (!answerSpan) {
        console.error("Error: Could not find the #answer span element in the DOM.");
        return;
    }

    console.log(`Fetching data from: ${apiUrl}`);
    answerSpan.textContent = "Loading data from server...";
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data received from API:", data);
            if (data && typeof data.latestData !== 'undefined') {
                answerSpan.textContent = data.latestData !== null ? data.latestData : 'No data has been submitted yet.';
            } else {
                console.error("Unexpected data format received:", data);
                answerSpan.textContent = 'Unexpected data format from server.';
            }
        })
        .catch(error => {
            console.error('Error fetching latest answer:', error);
            answerSpan.textContent = `Error loading data: ${error.message}`;
        });
});
