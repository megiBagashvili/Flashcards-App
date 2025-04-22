import { Flashcard, AnswerDifficulty, BucketMap } from "../logic/flashcards";

export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}

export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

export interface HintRequest {
  cardFront: string;
  cardBack: string;
}

export interface PracticeRecord {
  cardFront: string;
  cardBack: string;
  timestamp: number;
  difficulty: AnswerDifficulty;
  previousBucket: number;
  newBucket: number;
}

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
