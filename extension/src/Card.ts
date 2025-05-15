/**
 * @file extension/src/Card.ts
 * @description Defines the immutable Card data type used within the browser extension's
 * in-memory representation.
 */

export class Card {
    public readonly front: string;
    public readonly back: string;
    public readonly hint: string;
    public readonly tags: ReadonlyArray<string>;

    // Representation Invariant (RI):
    // - this.front.trim().length > 0
    // - this.back.trim().length > 0
    // - this.tags is always a valid ReadonlyArray<string> (never null or undefined)
    //
    // Abstraction Function (AF):
    // AF(this) = A flashcard with the question this.front, the answer this.back,
    //            an optional hint this.hint, and associated categories this.tags.

    /**
     * Creates an immutable instance of a flashcard.
     *
     * @constructor
     * @param {string} front - The text for the front side of the card. Cannot be empty or only whitespace.
     * @param {string} back - The text for the back side of the card. Cannot be empty or only whitespace.
     * @param {string} [hint=""] - An optional hint for the card. Defaults to an empty string.
     * @param {ReadonlyArray<string>} [tags=[]] - An optional array of tags. Defaults to an empty array. A copy is made for immutability.
     * @throws {Error} if front or back is empty or contains only whitespace after trimming.
     * @spec.effects Initializes the readonly properties front, back, hint, and tags. Calls checkRep() to validate invariants upon construction.
     */    
    constructor(
        front: string,
        back: string,
        hint: string = "",
        tags: ReadonlyArray<string> = []
    ) {
        if (front.trim().length === 0 || back.trim().length === 0) {
            throw new Error("Flashcard front and back cannot be empty.");
        }
        this.front = front;
        this.back = back;
        this.hint = hint;
        this.tags = Object.freeze([...tags]);
        this.checkRep();
    }

    /**
     * Checks that the representation invariant holds for this instance.
     * Primarily ensures that front and back are non-empty strings.
     * Intended for internal use and debugging.
     *
     * @private
     * @throws {Error} if the representation invariant is violated.
     * @spec.effects Reads this.front and this.back. Throws an error if either is empty or whitespace.
     */
    private checkRep(): void {
        if (this.front.trim().length === 0) {
            throw new Error("RI violated: front is empty");
        }
        if (this.back.trim().length === 0) {
            throw new Error("RI violated: back is empty");
        }
    }

     /**
     * Returns a simple string representation of the card, primarily for debugging.
     *
     * @public
     * @returns {string} A string summarizing the card's front and back content.
     * @spec.effects Reads this.front and this.back.
     */
    public toString(): string {
        return `Card(Front: "<span class="math-inline">\{this\.front\}", Back\: "</span>{this.back}")`;
    }

    
    /**
     * Checks if this Card instance is equal to another Card instance based on content.
     * Compares front, back, hint, and tags for equality
     *
     * @public
     * @param {Card} other - The other Card instance to compare against.
     * @returns {boolean} True if all properties are equal, false otherwise.
     * @spec.effects Reads properties of this and other.
     */
    public equals(other: Card): boolean {
        return this.front === other.front &&
               this.back === other.back &&
               this.hint === other.hint &&
               this.tags.length === other.tags.length &&
               this.tags.every((tag, index) => tag === other.tags[index]);
    }
}
