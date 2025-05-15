import axios from 'axios';
import { Flashcard, AnswerDifficulty, PracticeSession, ProgressStats } from '../types';

const API_BASE_URL = 'http://13.48.195.184:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
export async function fetchPracticeCards(): Promise<PracticeSession> {
  const response = await apiClient.get<PracticeSession>('/practice');
  return response.data;
}

export async function submitAnswer(
  cardId: number,
  difficulty: AnswerDifficulty
): Promise<void> {
  await apiClient.post('/update', { cardId, difficulty });
}

export async function fetchHint(card: Flashcard): Promise<string> {
  const response = await apiClient.get<{ hint: string }>('/hint', {
    params: { cardFront: card.front, cardBack: card.back },
  });
  return response.data.hint;
}

export async function fetchProgress(): Promise<ProgressStats> {
  const response = await apiClient.get<ProgressStats>('/progress');
  return response.data;
}

export async function advanceDay(): Promise<{ currentDay: number }> {
  const response = await apiClient.post<{ currentDay: number }>('/day/next');
  return response.data;
}