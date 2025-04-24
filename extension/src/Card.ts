export class Card {
    public readonly front: string;
    public readonly back: string;
    public readonly hint: string;
    public readonly tags: ReadonlyArray<string>;

    // Representation Invariant: front and back must be non-empty strings.
    // Abstraction Function: Represents a flashcard with a front side, a back side,
    
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
     * Checks that the representation invariant holds.
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
     * Returns a string representation of the card
     */
    public toString(): string {
        return `Card(Front: "<span class="math-inline">\{this\.front\}", Back\: "</span>{this.back}")`;
    }
    public equals(other: Card): boolean {
        return this.front === other.front &&
               this.back === other.back &&
               this.hint === other.hint &&
               this.tags.length === other.tags.length &&
               this.tags.every((tag, index) => tag === other.tags[index]);
    }
}