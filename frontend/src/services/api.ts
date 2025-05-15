/**
 * @file frontend/src/services/api.ts
 * @description API client and service functions for interacting with the backend.
 */
import axios, { AxiosResponse } from 'axios';
import { AnswerDifficulty, PracticeSession, ProgressStats } from '../types';

/**
 * @const {string} API_BASE_URL
 * @description Base URL for the backend API.
 * IMPORTANT: This needs to point to your deployed backend's public IP and port.
 * During local development, it might be 'http://localhost:3001/api'.
 * For EC2 deployment, it should be 'http://13.48.195.184:3001/api'.
 */
const API_BASE_URL = 'http://13.48.195.184:3001/api';

/**
 * @const apiClient
 * @description Axios instance configured with the base URL and default headers.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * @async
 * @function fetchPracticeCards
 * @description Fetches cards due for practice from the backend.
 * @returns {Promise<PracticeSession>} A promise that resolves to the practice session data.
 * @throws {Error} If the API request fails.
 */
export async function fetchPracticeCards(): Promise<PracticeSession> {
  console.log(`[API Service] Fetching practice cards from: ${API_BASE_URL}/practice`);
  const response: AxiosResponse<PracticeSession> = await apiClient.get<PracticeSession>('/practice');
  return response.data;
}

/**
 * @async
 * @function submitAnswer
 * @description Submits the result of a card review to the backend.
 * @param {number} cardId - The ID of the card that was reviewed.
 * @param {AnswerDifficulty} difficulty - The user's assessment of the card's difficulty.
 * @returns {Promise<void>} A promise that resolves when the update is successful.
 * @throws {Error} If the API request fails.
 *
 * @spec.requires `cardId` is a valid ID of an existing card. `difficulty` is a valid AnswerDifficulty enum member.
 * @spec.effects Sends a POST request to `/update` with `{ cardId, difficulty }`.
 */
export async function submitAnswer(
  cardId: number,
  difficulty: AnswerDifficulty
): Promise<void> {
  console.log(`[API Service] Submitting answer for card ID ${cardId} with difficulty ${difficulty} to: ${API_BASE_URL}/update`);
  await apiClient.post('/update', { cardId, difficulty });
}

/**
 * @interface HintResponse
 * @description Defines the expected structure of the response from the /hint endpoint.
 */
interface HintResponse {
  hint: string;
}

/**
 * @async
 * @function fetchHint
 * @description Fetches a hint for a given flashcard.
 * @param {Pick<Flashcard, 'front' | 'back'>} cardData - An object containing the front and back of the card.
 * @returns {Promise<string>} A promise that resolves to the hint string.
 * @throws {Error} If the API request fails.
 */
export async function fetchHint(cardData: { front: string; back: string }): Promise<string> {
  console.log(`[API Service] Fetching hint for card front "${cardData.front}" from: ${API_BASE_URL}/hint`);
  const response: AxiosResponse<HintResponse> = await apiClient.get<HintResponse>('/hint', {
    params: { cardFront: cardData.front, cardBack: cardData.back },
  });
  return response.data.hint;
}

/**
 * @async
 * @function fetchProgress
 * @description Fetches learning progress statistics from the backend.
 * @returns {Promise<ProgressStats>} A promise that resolves to the progress statistics.
 * @throws {Error} If the API request fails.
 */
export async function fetchProgress(): Promise<ProgressStats> {
  console.log(`[API Service] Fetching progress from: ${API_BASE_URL}/progress`);
  const response: AxiosResponse<ProgressStats> = await apiClient.get<ProgressStats>('/progress');
  return response.data;
}

/**
 * @interface AdvanceDayResponse
 * @description Defines the expected structure of the response from the /day/next endpoint.
 */
interface AdvanceDayResponse {
  currentDay: number;
  message?: string;
}

/**
 * @async
 * @function advanceDay
 * @description Tells the backend to advance to the next day.
 * @returns {Promise<{ currentDay: number }>} A promise that resolves to an object containing the new current day.
 * @throws {Error} If the API request fails.
 */
export async function advanceDay(): Promise<{ currentDay: number }> {
  console.log(`[API Service] Advancing day via: ${API_BASE_URL}/day/next`);
  const response: AxiosResponse<AdvanceDayResponse> = await apiClient.post<AdvanceDayResponse>('/day/next');
  return { currentDay: response.data.currentDay };
}
