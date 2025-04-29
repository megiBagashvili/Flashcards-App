import express, { Request, Response, Router } from 'express';
import pool from '../db';
import * as state from '../state'; 
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import { getHint as calculateHint } from '../logic/algorithm'; 
import { ProgressStats } from '../types';

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
    if (!Object.values(AnswerDifficulty).includes(Number(difficulty))) {
        return res.status(400).json({ error: `Invalid difficulty level: ${difficulty}` });
    }
    const numericDifficulty = Number(difficulty) as AnswerDifficulty;

    try {
        const findResult = await pool.query<{ id: number }>(
            'SELECT id FROM cards WHERE front = $1 AND back = $2',
            [cardFront, cardBack]
        );

        if (findResult.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }
        const cardId = findResult.rows[0].id;

        let newDueDateExpression: string;
        switch (numericDifficulty) {
            case AnswerDifficulty.Easy:
                newDueDateExpression = "NOW() + interval '1 day'";
                break;
            case AnswerDifficulty.Hard:
            case AnswerDifficulty.Wrong:
            default:
                newDueDateExpression = 'NOW()';
                break;
        }

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
router.get('/hint', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/hint received with query:`, req.query);
    const { cardFront, cardBack } = req.query;

    if (typeof cardFront !== 'string' || typeof cardBack !== 'string' || !cardFront || !cardBack) {
        return res.status(400).json({ error: 'Missing required query parameters: cardFront, cardBack' });
    }

    try {
        const result = await pool.query<{ front: string; back: string; hint: string | null; tags: string[] | null }>(
            'SELECT front, back, hint, tags FROM cards WHERE front = $1 AND back = $2',
            [cardFront, cardBack]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const dbRow = result.rows[0];
        const card = new Flashcard(
            dbRow.front,
            dbRow.back,
            dbRow.hint ?? '',
            dbRow.tags ?? []
        );

        const hintText = calculateHint(card);
        console.log(`[API] GET /api/hint - Hint generated for "${card.front}": ${hintText}`);

        res.status(200).json({ hint: hintText });

    } catch (error) {
        console.error("[API] Error getting hint:", error);
        res.status(500).json({ error: "Failed to get hint" });
    }
});

// GET /api/progress - Get user progress stats
router.get('/progress', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/progress received`);
    try {
        const bucketResult = await pool.query<{ interval: number; count: string }>(
            `SELECT "interval", COUNT(*) as count FROM cards GROUP BY "interval" ORDER BY "interval"`
        );

        const bucketDistribution: Record<number, number> = {};
        bucketResult.rows.forEach(row => {
            const intervalNum = Number(row.interval);
            const countNum = Number(row.count);
            if (!isNaN(intervalNum) && !isNaN(countNum)) {
                bucketDistribution[intervalNum] = countNum;
            }
        });

        const accuracyRate = 0;
        const averageDifficulty = undefined;

        const progressStats: ProgressStats = {
            accuracyRate,
            bucketDistribution,
            averageDifficulty
        };

        console.log("[API] GET /api/progress - Calculated progress:", progressStats);
        res.status(200).json(progressStats);

    } catch (error) {
        console.error("[API] Error fetching progress:", error);
        res.status(500).json({ error: "Failed to fetch progress data" });
    }
});

router.post('/day/next', (req: Request, res: Response) => { 
    console.log(`[API] POST /api/day/next received`);
    try {
        state.incrementDay();
        const newDay = state.getCurrentDay();

        console.log(`[API] POST /api/day/next - Advanced to Day ${newDay}`);
        res.status(200).json({
            message: `Advanced to day ${newDay}`,
            currentDay: newDay
        });
    } catch (error) {
        console.error("[API] Error advancing day:", error);
        res.status(500).json({ error: "Failed to advance day" });
    }
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
