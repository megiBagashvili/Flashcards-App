/**
 * @file backend/src/assignmentStore.ts
 * @description Provides a simple in-memory store for the deployment assignment.
 * This module will hold the most recently submitted text data from the
 * `/api/create-answer` endpoint and provide functions to set and get this data.
 *
 * This is a volatile in-memory store. Data will be lost on server restart.
 * It is designed specifically for the simplicity of the deployment assignment.
 */

/**
 * @let {string | null} latestSubmittedData
 * @description A module-scoped variable to store the most recent string data
 * received by the `/api/create-answer` endpoint. Initialized to `null`.
 * This variable is not directly exported to ensure controlled access via getter/setter.
 */
let latestSubmittedData: string | null = null;

/**
 * @function setLatestSubmittedData
 * @description Updates the `latestSubmittedData` with the new data string.
 * @param {string} data - The text data string to store.
 * @spec.effects Modifies the module-scoped `latestSubmittedData` variable.
 */
export const setLatestSubmittedData = (data: string): void => {
    console.log(`[AssignmentStore] Setting latest data to: "${data}"`);
    latestSubmittedData = data;
};

/**
 * @function getLatestSubmittedData
 * @description Retrieves the most recently stored `latestSubmittedData`.
 * @returns {string | null} The stored data string, or `null` if no data has been set yet.
 * @spec.effects Reads the module-scoped `latestSubmittedData` variable.
 */
export const getLatestSubmittedData = (): string | null => {
    console.log(`[AssignmentStore] Getting latest data: "${latestSubmittedData}"`);
    return latestSubmittedData;
};

// Optional: Log when the module is initialized
console.log("[AssignmentStore] In-memory store initialized.");
