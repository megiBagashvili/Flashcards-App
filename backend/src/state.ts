import { Flashcard, BucketMap, AnswerDifficulty } from "../src/logic/flashcards";
import { PracticeRecord } from "./types/index";


const initialCards: Flashcard[] = [
    new Flashcard("What is TypeScript?", "A superset of JavaScript.", "Think about JavaScript with types.", ["programming", "typescript"]),
    new Flashcard("What is a closure?", "A function with preserved lexical scope.", "Functions remember their surroundings.", ["javascript", "functions"]),
    new Flashcard("What does HTTP stand for?", "HyperText Transfer Protocol", "Think about how the web communicates.", ["networking", "protocol"]),
  ];

  let currentBuckets: BucketMap = new Map();
currentBuckets.set(0, new Set(initialCards)); // Place all cards in bucket 0

let practiceHistory: PracticeRecord[] = [];

let currentDay: number = 0;

export function getBuckets(): BucketMap {
    return currentBuckets;
  }
  
  export function setBuckets(newBuckets: BucketMap): void {
    currentBuckets = newBuckets;
  }
  
  export function getHistory(): PracticeRecord[] {
    return practiceHistory;
  }
  
  export function addHistoryRecord(record: PracticeRecord): void {
    practiceHistory.push(record);
  }
  
  export function getCurrentDay(): number {
    return currentDay;
  }
  
  export function incrementDay(): void {
    currentDay++;
  }

  
  export function findCard(front: string, back: string): Flashcard | undefined {
    for (const cards of currentBuckets.values()) {
      for (const card of cards) {
        if (card.front === front && card.back === back) {
          return card;
        }
      }
    }
    return undefined;
  }
  
  export function findCardBucket(cardToFind: Flashcard): number | undefined {
    for (const [bucket, cards] of currentBuckets.entries()) {
      if (cards.has(cardToFind)) {
        return bucket;
      }
    }
    return undefined;
  }

  console.log("Initial state loaded:");
  console.log("Buckets:", currentBuckets);
  console.log("History:", practiceHistory);
  console.log("Current Day:", currentDay);

  
  