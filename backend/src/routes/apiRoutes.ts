import express, { Request, Response, Router } from 'express';
import pool from '../db';
import * as state from '../state';
import { Flashcard } from '../logic/flashcards'; 

const router: Router = express.Router();

// GET /api/practice - Fetch cards for practice session
router.get('/practice', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/practice received`);
    try {
        const currentDay = state.getCurrentDay(); 

        const result = await pool.query<{ id: number; front: string; back: string; hint: string | null; tags: string[] | null }>(
            `SELECT id, front, back, hint, tags
             FROM cards
             WHERE due_date <= NOW()
             ORDER BY RANDOM()
             LIMIT 10` 
        );

        const practiceCards: Flashcard[] = result.rows.map(row => new Flashcard(
            row.front,
            row.back,
            row.hint ?? '',
            row.tags ?? []
        ));

        console.log(`[API] GET /api/practice - Day ${currentDay}: Found ${practiceCards.length} cards due.`);
        res.status(200).json({
            cards: practiceCards,
            day: currentDay
        });

    } catch (error) {
        console.error("[API] Error fetching practice cards:", error);
        res.status(500).json({ error: "Failed to fetch practice cards" });
    }
});

// POST /api/update - Update card review status (Placeholder)
router.post('/update', (req: Request, res: Response) => {
    console.log(`[API Placeholder] POST /api/update hit with body:`, req.body);
    const { cardFront, cardBack, difficulty } = req.body;
    if (cardFront === undefined || cardBack === undefined || difficulty === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    res.status(200).json({ message: 'Placeholder: POST /api/update successful' });
});

// GET /api/hint - Get a hint for a card (Placeholder)
router.get('/hint', (req: Request, res: Response) => {
    console.log(`[API Placeholder] GET /api/hint hit with query:`, req.query);
    const { cardFront, cardBack } = req.query;
    if (!cardFront || !cardBack) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }
    res.status(200).json({ message: 'Placeholder for GET /api/hint', hint: `Hint for ${cardFront}` });
});

// GET /api/progress - Get user progress stats (Placeholder)
router.get('/progress', (req: Request, res: Response) => {
    console.log(`[API Placeholder] GET /api/progress hit`);
    res.status(200).json({ message: 'Placeholder for GET /api/progress', accuracyRate: 0, bucketDistribution: {}, averageDifficulty: undefined });
});

router.post('/day/next', (req: Request, res: Response) => {
    console.log(`[API Placeholder] POST /api/day/next hit`);
    const newDay = state.getCurrentDay() + 1; 
    state.incrementDay();
    res.status(200).json({ message: 'Placeholder for POST /api/day/next', currentDay: newDay });
});

// POST /api/cards - Create a new card 
router.post('/cards', (req: Request, res: Response) => {
    console.log(`[API Placeholder] POST /api/cards hit with body:`, req.body);
    const { front, back } = req.body;
    if (!front || !back) {
         return res.status(400).json({ error: 'Missing required fields: front, back' });
     }
    res.status(201).json({ message: 'Placeholder: POST /api/cards (card created)' });
});

export default router;
