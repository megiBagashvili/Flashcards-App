import { Card } from './Card';

export class Deck {
    // Representation Invariant: cards contains only valid Card objects, no duplicates.
    // Abstraction Function: Represents a collection of flashcards.
    private cards: Set<Card>; // Using a Set to easily avoid duplicate cards

    constructor(initialCards?: Card[]) {
        this.cards = new Set(initialCards);
        this.checkRep();
    }

    /**
     * Checks that the representation invariant holds.
     */
    private checkRep(): void {
        for (const item of this.cards) {
            if (!(item instanceof Card)) {
                throw new Error("RI violated: Deck contains non-Card objects.");
            }
        }
    }

    /**
     * Adds a card to the deck.
     * Does nothing if an equivalent card is already present (due to Set behavior).
     * @param card The Card object to add.
     */
    public addCard(card: Card): void {
        this.cards.add(card);
        this.checkRep();
    }

    /**
     * Removes a card from the deck.
     * @param card The Card object to remove.
     * @returns true if the card was found and removed, false otherwise.
     */
    public removeCard(card: Card): boolean {
        const deleted = this.cards.delete(card);
        this.checkRep();
        return deleted;
    }

    /**
     * Returns all cards currently in the deck.
     * @returns A new array containing all Card objects in the deck.
     */
    public getCards(): Card[] {
        return Array.from(this.cards);
    }

    /**
     * Returns the number of cards in the deck.
     */
    public size(): number {
        return this.cards.size;
    }

    /**
     * Returns a string representation of the deck (e.g., for debugging).
     */
    public toString(): string {
        return `Deck containing ${this.size()} cards.`;
    }
}