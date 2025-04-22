/**
 * Problem Set 1: Flashcards - Algorithm Functions
 *
 * This file contains the implementations for the flashcard algorithm functions
 * as described in the problem set handout.
 *
 * Please DO NOT modify the signatures of the exported functions in this file,
 * or you risk failing the Didit autograder.
 */

import { Flashcard, AnswerDifficulty, BucketMap } from "./flashcards";

/**
 * Converts a Map representation of learning buckets into an Array-of-Set representation.
 *
 * @param buckets Map where keys are bucket numbers and values are sets of Flashcards.
 * @returns Array of Sets, where element at index i is the set of flashcards in bucket i.
 *          Buckets with no cards will have empty sets in the array.
 * @spec.requires buckets is a valid representation of flashcard buckets.
 */
export function toBucketSets(buckets: BucketMap): Array<Set<Flashcard>> {
  const maxBucket = Math.max(...buckets.keys(), -1);
  const bucketArray: Array<Set<Flashcard>> = Array.from({ length: maxBucket + 1 }, () => new Set());
  for (const [bucket, flashcards] of buckets.entries()) {
    bucketArray[bucket] = flashcards;
  }

  return bucketArray;
}

/**
 * Finds the range of buckets that contain flashcards, as a rough measure of progress.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @returns object with minBucket and maxBucket properties representing the range,
 *          or undefined if no buckets contain cards.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
export function getBucketRange(
  buckets: Array<Set<Flashcard>>
): { minBucket: number; maxBucket: number } | undefined {
  let min = Infinity;
  let max = -Infinity;

  buckets.forEach((set, index) => {
    if (set.size > 0) {
      min = Math.min(min, index);
      max = Math.max(max, index);
    }
  });

  return isFinite(min) ? {minBucket: min, maxBucket: max} : undefined;
}

/**
 * Selects cards to practice on a particular day.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @param day current day number (starting from 0).
 * @returns a Set of Flashcards that should be practiced on day `day`,
 *          according to the Modified-Leitner algorithm.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
export function practice(
  buckets: Array<Set<Flashcard>>,
  day: number
): Set<Flashcard> {
  if (day < 0) {
    throw new Error("Day number must be non-negative");
  }

  const selectedCards: Set<Flashcard> = new Set();

  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i] && day % (1 << i) === 0) {
      for (const card of buckets[i]!) {
        selectedCards.add(card);
      }
    }
  }

  return selectedCards;
}



/**
 * Updates a card's bucket number after a practice trial.
 *
 * @param buckets Map representation of learning buckets.
 * @param card flashcard that was practiced.
 * @param difficulty how well the user did on the card in this practice trial.
 * @returns updated Map of learning buckets.
 * @spec requires buckets is a valid representation of flashcard buckets.
 */
export function update(
  buckets: BucketMap,
  card: Flashcard,
  difficulty: AnswerDifficulty
): BucketMap {
  let currentBucket: number | undefined;
  for (const [bucket, cards] of buckets) {
    if (cards.has(card)) {
      currentBucket = bucket;
      break;
    }
  }

  if (currentBucket === undefined) {
    throw new Error("Card not found");
  }

  let newBucket = currentBucket;
  if (difficulty === AnswerDifficulty.Easy) {
    newBucket = Math.min(currentBucket + 1, buckets.size - 1);
  } else if (difficulty === AnswerDifficulty.Hard) {
    newBucket = Math.max(currentBucket - 1, 0);
  }

  buckets.get(currentBucket)?.delete(card);

  if (!buckets.has(newBucket)) {
    buckets.set(newBucket, new Set());
  }
  buckets.get(newBucket)?.add(card);

  return buckets;
}


/**
 * Generates a contextual hint for a flashcard.
 *
 * @param card The flashcard for which a hint is needed.
 * @returns A string providing a hint for the front of the flashcard.
 * 
 * @spec requires `card` is a valid instance of `Flashcard`.
 * @spec ensures If `card.hint` is a non-empty string (ignoring whitespace), it is returned as the hint.
 * @spec ensures If `card.hint` is empty or contains only whitespace, a generated hint is returned in the format:
 *               `"Think about the key concepts related to [front]"`
 * @spec ensures The output is **deterministic**—same input always yields the same output.
 * @spec ensures The hint remains useful across various learning domains (e.g., language, science, history).
 */


export function getHint(card: Flashcard): string {
  const trimmedHint = card.hint.trim();
  return trimmedHint !== "" ? trimmedHint : `Think about the key concepts related to ${card.front}`;
}





/**
 * Computes statistics about the user's learning progress.
 *
 * @param buckets A `BucketMap` representing the current flashcard distribution.
 * @param history An array of past answer records, where each record contains:
 *        - `card`: the `Flashcard` that was practiced.
 *        - `difficulty`: an `AnswerDifficulty` representing the user's response.
 *        - `timestamp`: a number representing the time of practice.
 * @returns An object containing:
 *        - `accuracyRate`: percentage of correct answers (Easy vs. total attempts).
 *        - `bucketDistribution`: an object mapping bucket numbers to counts of flashcards.
 *        - `averageDifficulty`: the mean difficulty of all past answers.
 *
 * @spec.requires `buckets` must be a valid `BucketMap`, with only non-negative integer keys.
 * @spec.requires `history` must be an array where each entry has valid `card`, `difficulty`, and `timestamp` fields.
 * @spec.ensures The returned object is never `null` or `undefined`.
 * @spec.ensures If no history exists, `accuracyRate` is 0 and `averageDifficulty` is `undefined`.
 */

export function computeProgress(buckets: BucketMap, history: Array<{ card: Flashcard; difficulty: AnswerDifficulty; timestamp: number }>) {
  if (![...buckets.keys()].every(k => Number.isInteger(k) && k >= 0)) {
    throw new Error("Invalid bucket keys: must be non-negative integers.");
  }

  if (!Array.isArray(history) || history.some(record => !record.card || record.difficulty === undefined || typeof record.timestamp !== "number")) {
    throw new Error("Invalid history data.");
  }

  const totalAttempts = history.length;
  const correctAttempts = history.filter(h => h.difficulty === AnswerDifficulty.Easy).length;
  const accuracyRate = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

  const bucketDistribution: Record<number, number> = {};
  buckets.forEach((cards, bucket) => {
    bucketDistribution[bucket] = cards.size;
  });

  const totalDifficulty = history.reduce((sum, h) => sum + h.difficulty, 0);
  const averageDifficulty = totalAttempts > 0 ? totalDifficulty / totalAttempts : undefined;

  return { accuracyRate, bucketDistribution, averageDifficulty };
}