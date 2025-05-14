let currentDay: number = 0;
let latestAnswer: string | null = null;

/**
 * Gets the current value of the in-memory day counter.
 * @returns The current day number.
 */
export function getCurrentDay(): number {
    return currentDay;
}

/**
 * Increments the in-memory day counter by one.
 */
export function incrementDay(): void {
    currentDay++;
}

/**
 * Sets the latest answer string.
 * @param answer The answer string to store.
 */
export function setLatestAnswer(answer: string): void {
    latestAnswer = answer;
    console.log(`[State] Latest answer set to: "${answer}"`);
}

/**
 * Gets the latest answer string.
 * @returns The stored answer string, or null if not set.
 */
export function getLatestAnswer(): string | null {
    console.log(`[State] Getting latest answer: "${latestAnswer}"`);
    return latestAnswer;
}

console.log("Simplified state loaded:");
console.log("Current Day:", currentDay);
console.log("Initial Latest Answer:", latestAnswer);