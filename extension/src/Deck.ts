import { Card } from './Card';

/**
 * Represents a collection of flashcards.
 * Currently uses a Set for storage, ensuring uniqueness based on Card object equality.
 */
export class Deck {
    // RI: cards contains only valid Card objects.
    // AF: Represents the set of flashcards currently held in the deck.
    private cards: Set<Card>;

    constructor(initialCards?: Card[]) {
        this.cards = new Set(initialCards);
        this.checkRep();
    }

    /**
     * Checks that the representation invariant holds.
     * Verifies all elements in the set are Card instances.
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
     * If an equivalent card is already present,
     * the Set might not add a duplicate depending on Card's implementation
     * and how Set handles object equality vs reference equality.
     * @param card The Card object to add.
     */
    public addCard(card: Card): void {
        this.cards.add(card);
        this.checkRep();
    }

    /**
     * Removes a card from the deck based on equality defined in Card.equals().
     * @param card The Card object to remove.
     * @returns true if an equivalent card was found and removed, false otherwise.
     */
    public removeCard(card: Card): boolean {
        let found = false;
        for (const existingCard of this.cards) {
            if (existingCard.equals(card)) {
                this.cards.delete(existingCard);
                found = true;
                break;
            }
        }
        this.checkRep();
        return found;
    }

    /**
     * Returns all cards currently in the deck as a new array.
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
     * Gets the next card due for review
     * Returns the first card found
     * Order is not guaranteed due to using a Set
     * @returns The next Card to review, or null if the deck is empty
     */
    public getNextCardToReview(): Card | null {
        if (this.cards.size === 0) {
            return null;
        }
        const cardArray = Array.from(this.cards);
        return cardArray[0] ?? null;
    }

    /**
     * Updates the review status/history of a card
     * @param card The card that was reviewed
     * @param difficulty The result of the review
     */
    public updateCardReview(card: Card, difficulty: number): void {
         let cardExists = false;
         for (const existingCard of this.cards) {
             if (existingCard.equals(card)) {
                 cardExists = true;
                 break;
             }
         }
         if (!cardExists) {
             console.warn(`Attempted to update review for non-existent card: "${card.front}"`);
             return;
         }
         console.log(`Updating review for card "${card.front}" with difficulty ${difficulty}`);
         this.checkRep();
    }

    /**
     * Returns a string representation of the deck.
     */
    public toString(): string {
        return `Deck containing ${this.size()} cards.`;
    }
}
