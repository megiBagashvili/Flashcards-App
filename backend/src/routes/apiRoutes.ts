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
        res.status(200).json({ cards: practiceCards, day: currentDay });
    } catch (error) {
        console.error("[API] Error fetching practice cards:", error);
        res.status(500).json({ error: "Failed to fetch practice cards" });
    }
});

// POST /api/update - Update card review status
router.post('/update', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/update received with body:`, req.body);
    const { cardFront, cardBack, difficulty } = req.body;

    if (cardFront === undefined || typeof cardFront !== 'string' || cardFront.trim() === '' ||
        cardBack === undefined || typeof cardBack !== 'string' || cardBack.trim() === '' ||
        difficulty === undefined) {
        return res.status(400).json({ error: 'Missing or invalid required fields: cardFront (string), cardBack (string), difficulty' });
    }
    const numericDifficultyValue = Number(difficulty);
    if (isNaN(numericDifficultyValue) || !Object.values(AnswerDifficulty).includes(numericDifficultyValue)) {
        return res.status(400).json({ error: `Invalid difficulty level: ${difficulty}` });
    }
    const numericDifficulty = numericDifficultyValue as AnswerDifficulty;

    try {
        const findResult = await pool.query<{ id: number }>(
            'SELECT id FROM cards WHERE trim(front) = trim($1) AND trim(back) = trim($2)',
            [cardFront.trim(), cardBack.trim()]
        );
        if (findResult.rows.length === 0) {
            console.warn(`[API] POST /api/update - Card not found for front: "${cardFront}"`);
            return res.status(404).json({ error: 'Card not found' });
        }
        const cardId = findResult.rows[0].id;

        let newDueDateExpression: string;
        switch (numericDifficulty) {
            case AnswerDifficulty.Easy: newDueDateExpression = "NOW() + interval '1 day'"; break;
            case AnswerDifficulty.Hard: newDueDateExpression = "NOW() + interval '10 minutes'"; break;
            case AnswerDifficulty.Wrong: default: newDueDateExpression = 'NOW()'; break;
        }
        const updateResult = await pool.query(
            `UPDATE cards SET due_date = ${newDueDateExpression}, updated_at = NOW() WHERE id = $1`,
            [cardId]
        );
        if (updateResult.rowCount === 0) {
            console.error(`[API] POST /api/update - Card ID ${cardId} found but failed to update.`);
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

    if (typeof cardFront !== 'string' || typeof cardBack !== 'string' || !cardFront.trim() || !cardBack.trim()) {
        return res.status(400).json({ error: 'Missing or invalid required query parameters: cardFront, cardBack' });
    }

    try {
        const result = await pool.query<{ front: string; back: string; hint: string | null; tags: string[] | null }>(
            'SELECT front, back, hint, tags FROM cards WHERE trim(front) = trim($1) AND trim(back) = trim($2)',
            [cardFront.trim(), cardBack.trim()]
        );
        if (result.rows.length === 0) {
            console.warn(`[API] GET /api/hint - Card not found for front: "${cardFront}"`);
            return res.status(404).json({ error: 'Card not found' });
        }
        const dbRow = result.rows[0];
        const card = new Flashcard(dbRow.front, dbRow.back, dbRow.hint ?? '', dbRow.tags ?? []);
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
        const bucketResult = await pool.query<{ bucket: number; count: string }>(
            `SELECT COALESCE("interval", 0) as bucket, COUNT(*) as count
             FROM cards
             GROUP BY bucket -- Use the alias here too
             ORDER BY bucket`
        );
        const bucketDistribution: Record<number, number> = {};
        bucketResult.rows.forEach(row => {
            const bucketNum = Number(row.bucket);
            const countNum = Number(row.count);
            if (!isNaN(bucketNum) && !isNaN(countNum)) {
                bucketDistribution[bucketNum] = countNum;
            }
        });
        const accuracyRate = 0;
        const averageDifficulty = undefined;

        const progressStats: ProgressStats = {
            accuracyRate,
            bucketDistribution,
            ...(averageDifficulty !== undefined && { averageDifficulty })
        };

        console.log("[API] GET /api/progress - Calculated progress:", progressStats);
        res.status(200).json(progressStats); 
    } catch (error) {
        console.error("[API] Error fetching progress:", error);
        res.status(500).json({ error: "Failed to fetch progress data" });
    }
});

// POST /api/day/next - Advance to the next practice day
router.post('/day/next', (req: Request, res: Response) => {
    console.log(`[API] POST /api/day/next received`);
    try {
        state.incrementDay();
        const newDay = state.getCurrentDay();
        console.log(`[API] POST /api/day/next - Advanced to Day ${newDay}`);
        res.status(200).json({ message: `Advanced to day ${newDay}`, currentDay: newDay });
    } catch (error) {
        console.error("[API] Error advancing day:", error);
        res.status(500).json({ error: "Failed to advance day" });
    }
});

// POST /api/cards - Create a new flashcard 
router.post('/cards', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/cards received with body:`, req.body);
    const { front, back, hint, tags } = req.body;

    if (!front || typeof front !== 'string' || front.trim() === '') {
        return res.status(400).json({ error: 'Missing or invalid required field: front (string)' });
    }
    if (!back || typeof back !== 'string' || back.trim() === '') {
        return res.status(400).json({ error: 'Missing or invalid required field: back (string)' });
    }
    const hintValue = (hint && typeof hint === 'string') ? hint.trim() : null;
    const tagsValue = (Array.isArray(tags) && tags.every(t => typeof t === 'string'))
                      ? tags.map(t => t.trim()).filter(t => t !== '')
                      : null;
    const finalTagsValue = (tagsValue && tagsValue.length > 0) ? tagsValue : null;

    try {
        const insertQuery = `
            INSERT INTO cards (front, back, hint, tags, due_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
            RETURNING *; -- Return the newly created row
        `;
        const values = [front.trim(), back.trim(), hintValue, finalTagsValue];

        const result = await pool.query<{
            id: number;
            front: string;
            back: string;
            hint: string | null;
            tags: string[] | null;
            due_date: Date; 
            created_at: Date; 
            updated_at: Date; 
            interval: number | null;
            ease_factor: number | null;
        }>(insertQuery, values); 

        if (result.rows.length > 0) {
            const newCard = result.rows[0];
            console.log(`[API] POST /api/cards - Successfully inserted card ID ${newCard.id}`);
            res.status(201).json(newCard);
        } else {
            console.error("[API] POST /api/cards - Insert query succeeded but returned no rows.");
            res.status(500).json({ error: "Failed to create card (no data returned)" });
        }

    } catch (error: any) {
        console.error("[API] Error inserting card:", error);
        res.status(500).json({ error: "Failed to insert card into database" });
    }
});

export default router;