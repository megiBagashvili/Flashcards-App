export interface Flashcard {
  id: number;
  front: string;
  back: string;
  hint?: string | null;
  tags?: string[] | null;
  due_date?: string;
}
  
  export enum AnswerDifficulty {
    Wrong = 0,
    Hard = 1,
    Easy = 2,
  }
  
  export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}
  
  export interface UpdateRequest {
    cardFront: string;
    cardBack: string;
    difficulty: AnswerDifficulty;
  }
  
  export interface ProgressStats {
    accuracyRate: number;
    bucketDistribution: Record<number, number>;
    averageDifficulty?: number;
  }
  