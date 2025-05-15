/**
 * @file backend/src/types/index.ts
 * @description Defines shared TypeScript interfaces and re-exports core types
 * used across the backend application, particularly for API request/response
 * bodies and internal data structures.
 */

import { Flashcard, AnswerDifficulty, BucketMap } from "../logic/flashcards";

/**
 * @interface PracticeSession
 * @description Represents the data structure returned by the /api/practice endpoint,
 * containing the cards due for review and the current day number.
 */
export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}

/**
 * @interface UpdateRequest
 * @description Represents the expected structure of the request body for the
 * /api/update endpoint when identifying cards by front/back
 */
export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

/**
 * @interface HintRequest
 * @description Represents the expected structure of query parameters for the
 * /api/hint endpoint.
 */
export interface HintRequest {
  cardFront: string;
  cardBack: string;
}

/**
 * @interface PracticeRecord
 * @description Represents a record of a single practice attempt for a flashcard.
 * Useful for calculating detailed progress statistics if review history is stored.
 */
export interface PracticeRecord {
  cardFront: string;
  cardBack: string;
  timestamp: number;
  difficulty: AnswerDifficulty;
  previousBucket: number;
  newBucket: number;
}

/**
 * @interface ProgressStats
 * @description Represents the structure of the progress statistics object returned
 * by the /api/progress endpoint.
 */
export interface ProgressStats {
  accuracyRate: number;
  bucketDistribution: Record<number, number>;
  averageDifficulty?: number;
}

export {
  Flashcard,
  AnswerDifficulty,
  BucketMap,
};
