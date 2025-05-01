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

        const result = await pool.query<{ id: number; front: string; back: string; hint: string | null; tags: string[] | null; due_date: Date }>(
            `SELECT id, front, back, hint, tags, due_date
             FROM cards
             WHERE due_date <= NOW()
             ORDER BY RANDOM() -- Or consider ORDER BY due_date ASC for priority
             LIMIT 10`
        );

        const practiceCardData = result.rows.map(row => ({
            id: row.id,
            front: row.front,
            back: row.back,
            hint: row.hint ?? null,
            tags: row.tags ?? null,
            due_date: row.due_date.toISOString()
        }));

        console.log(
            `[API] GET /api/practice - Day ${currentDay}: Found ${practiceCardData.length} cards due.`
        );
        res.status(200).json({ cards: practiceCardData, day: currentDay });
    } catch (error) {
        console.error("[API] Error fetching practice cards:", error);
        res.status(500).json({ error: "Failed to fetch practice cards" });
    }
});

// POST /api/update - Update card review status based on ID
router.post('/update', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/update received with body:`, req.body);
    const { cardId, difficulty } = req.body;

    if (cardId === undefined || typeof cardId !== 'number' ||
        difficulty === undefined) {
        console.warn("[API] POST /api/update - Missing required fields");
        return res.status(400).json({
            error: "Missing required fields: cardId (number), difficulty",
        });
    }
    const numericDifficulty = Number(difficulty);
    if (isNaN(numericDifficulty) || !Object.values(AnswerDifficulty).includes(numericDifficulty)) {
        console.warn(`[API] POST /api/update - Invalid difficulty value: ${difficulty}`);
        return res.status(400).json({ error: `Invalid difficulty level: ${difficulty}` });
    }

    try {
        console.log(`[API /update] Attempting to update card ID: ${cardId}`);

        let newDueDateExpression: string;
        switch (numericDifficulty as AnswerDifficulty) {
            case AnswerDifficulty.Easy:
                newDueDateExpression = "NOW() + interval '1 day'";
                console.log(`[API /update] Difficulty Easy, setting due in 1 day for ID ${cardId}.`);
                break;
            case AnswerDifficulty.Hard:
                newDueDateExpression = "NOW() + interval '10 minutes'";
                console.log(`[API /update] Difficulty Hard, setting due in 10 minutes for ID ${cardId}.`);
                break;
            case AnswerDifficulty.Wrong:
            default:
                newDueDateExpression = "NOW() + interval '1 minute'";
                console.log(`[API /update] Difficulty Wrong, setting due in 1 minute for ID ${cardId}.`);
                break;
        }
        const updateResult = await pool.query(
            `UPDATE cards SET due_date = ${newDueDateExpression}, updated_at = NOW() WHERE id = $1`,
            [cardId]
        );

        if (updateResult.rowCount === 0) {
            console.error(`[API /update] Failed to update card ID ${cardId}, rowCount is 0. Card ID might not exist.`);
            return res.status(404).json({ error: "Card not found for the provided ID" });
        }

        console.log(`[API /update] Successfully updated card ID ${cardId}`);
        res.status(200).json({ message: "Card review updated successfully" });

    } catch (error) {
        console.error(`[API] Error updating card review for ID ${cardId}:`, error);
        res.status(500).json({ error: "Failed to update card review" });
    }
});

// GET /api/hint - Get a hint for a card (Still uses front/back lookup)
router.get('/hint', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/hint received with query:`, req.query);
    const { cardFront, cardBack } = req.query;

    if (typeof cardFront !== 'string' || typeof cardBack !== 'string' || !cardFront.trim() || !cardBack.trim()) {
        console.warn('[API] GET /api/hint - Missing or invalid query params');
        return res.status(400).json({ error: 'Missing or invalid required query parameters: cardFront, cardBack' });
    }

    try {
        console.log(`[API /hint] Searching for card: Front="${cardFront}", Back="${cardBack}"`);
        const result = await pool.query<{ front: string; back: string; hint: string | null; tags: string[] | null }>(
            'SELECT front, back, hint, tags FROM cards WHERE trim(front) = trim($1) AND trim(back) = trim($2)',
            [cardFront.trim(), cardBack.trim()]
        );
        if (result.rows.length === 0) {
            console.warn(`[API /hint] Card not found in DB for Front="${cardFront}"`);
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
        console.log(`[API] GET /api/hint - Hint generated/retrieved for "${card.front}": ${hintText}`);
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
            if (!isNaN(bucketNum) && !isNaN(countNum)) { bucketDistribution[bucketNum] = countNum; }
            else { console.warn(`[API /progress] Invalid row data received:`, row); }
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
router.post("/cards", async (req: Request, res: Response) => {
    console.log(`[API] POST /api/cards received with body:`, req.body);
    const { front, back, hint, tags } = req.body;
    if (!front || typeof front !== 'string' || front.trim() === '') { return res.status(400).json({ error: 'Missing or invalid required field: front (string)' }); }
    if (!back || typeof back !== 'string' || back.trim() === '') { return res.status(400).json({ error: 'Missing or invalid required field: back (string)' }); }
    const hintValue = (hint && typeof hint === 'string') ? hint.trim() : null;
    const tagsValue = (Array.isArray(tags) && tags.every(t => typeof t === 'string')) ? tags.map(t => t.trim()).filter(t => t !== '') : null;
    const finalTagsValue = (tagsValue && tagsValue.length > 0) ? tagsValue : null;
    try {
        const insertQuery = `
            INSERT INTO cards (front, back, hint, tags, due_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
            RETURNING *;
        `;
        const values = [front.trim(), back.trim(), hintValue, finalTagsValue];
        const result = await pool.query<{
            id: number; front: string; back: string; hint: string | null; tags: string[] | null;
            due_date: Date; created_at: Date; updated_at: Date; interval: number | null; ease_factor: number | null;
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
