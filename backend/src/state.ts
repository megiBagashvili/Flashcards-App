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

console.log("Simplified state loaded:");
console.log("Current Day:", currentDay);
console.log("Initial Latest Answer:", latestAnswer);