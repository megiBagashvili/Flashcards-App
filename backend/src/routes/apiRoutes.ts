import express, { Request, Response, Router } from 'express';
import pool from '../db';
import * as state from '../state'; 
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';

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

// POST /api/update - Update card review status
router.post('/update', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/update received with body:`, req.body);
    const { cardFront, cardBack, difficulty } = req.body;
    if (cardFront === undefined || cardBack === undefined || difficulty === undefined) {
        return res.status(400).json({ error: 'Missing required fields: cardFront, cardBack, difficulty' });
    }
    if (!(difficulty in AnswerDifficulty)) {
        return res.status(400).json({ error: `Invalid difficulty level: ${difficulty}` });
    }

    try {
        // Find Card ID
        const findResult = await pool.query<{ id: number }>(
            'SELECT id FROM cards WHERE front = $1 AND back = $2',
            [cardFront, cardBack]
        );

        if (findResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }
        const cardId = findResult.rows[0].id;

        let newDueDateExpression: string;
        switch (difficulty as AnswerDifficulty) {
            case AnswerDifficulty.Easy:
                newDueDateExpression = "NOW() + interval '1 day'";
                break;
            case AnswerDifficulty.Hard:
            case AnswerDifficulty.Wrong:
            default:
                newDueDateExpression = 'NOW()';
                break;
        }

        // Execute UPDATE query
        const updateResult = await pool.query(
            `UPDATE cards SET due_date = ${newDueDateExpression}, updated_at = NOW() WHERE id = $1`,
            [cardId]
        );

        if (updateResult.rowCount === 0) {
             console.error(`[API] POST /api/update - Failed to update card ID ${cardId}, rowCount is 0.`);
             return res.status(404).json({ error: 'Card found but failed to update' });
        }

        console.log(`[API] POST /api/update - Successfully updated card ID ${cardId}`);
        res.status(200).json({ message: 'Card review updated successfully' });

    } catch (error) {
        console.error("[API] Error updating card review:", error);
        res.status(500).json({ error: "Failed to update card review" });
    }
});

// GET /api/hint - Get a hint for a card 
router.get('/hint', (req: Request, res: Response) => {
    console.log(`[API Placeholder] GET /api/hint hit with query:`, req.query);
    const { cardFront, cardBack } = req.query;
    if (!cardFront || !cardBack) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }
    res.status(200).json({ message: 'Placeholder for GET /api/hint', hint: `Hint for ${cardFront}` });
});

// GET /api/progress - Get user progress stats 
router.get('/progress', (req: Request, res: Response) => {
    console.log(`[API Placeholder] GET /api/progress hit`);
    res.status(200).json({ message: 'Placeholder for GET /api/progress', accuracyRate: 0, bucketDistribution: {}, averageDifficulty: undefined });
});

// POST /api/day/next - Advance to the next practice day 
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
