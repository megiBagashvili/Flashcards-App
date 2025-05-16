import express, { Request, Response, Router } from 'express';
import pool from '../db';
import * as state from '../state';
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import { getHint as calculateHint } from '../logic/algorithm';
import { ProgressStats } from '../types';
// Import functions from assignmentStore
import { setLatestSubmittedData, getLatestSubmittedData } from '../assignmentStore';

const router: Router = express.Router();

// API Route Handlers

/**
 * @name GET /api/practice
 * @description Fetches a list of flashcards due for practice for the current day.
 * TEMPORARILY MODIFIED: Returns an empty list to avoid DB call for assignment.
 * @route GET /api/practice
 * @param {Request} req The Express request object. No parameters or body expected.
 * @param {Response} res The Express response object used to send back the practice session data or an error.
 * @returns {Promise<void>}
 */
router.get('/practice', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/practice received (TEMPORARILY MODIFIED - NO DB CALL)`);
    try {
        const currentDay = state.getCurrentDay();

        
        const result = await pool.query<{ id: number; front: string; back: string; hint: string | null; tags: string[] | null; due_date: Date }>(
            `SELECT id, front, back, hint, tags, due_date
             FROM cards
             WHERE due_date <= NOW()
             ORDER BY RANDOM()
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
            `[API] GET /api/practice - Day ${currentDay}: Found ${practiceCardData.length} cards due (mocked).`
        );
        res.status(200).json({ cards: practiceCardData, day: currentDay });

    } catch (error) {
        // This catch block might not be reached if the DB call is removed,
        // but good to keep for other potential errors.
        console.error("[API] Error in (modified) /api/practice:", error);
        res.status(500).json({ error: "Failed to fetch practice cards (modified endpoint)" });
    }
});

/**
 * @name POST /api/update
 * @description Updates the review status (specifically due_date and updated_at) of a flashcard based on its ID and the provided difficulty.
 * @route POST /api/update
 * @param {Request} req The Express request object. Expects a JSON body { cardId: number, difficulty: AnswerDifficulty }.
 * @param {Response} res The Express response object used to send back a success message or an error.
 * @returns {Promise<void>}
 *
 * @spec.requires Database pool is connected and the cards table exists. req.body contains cardId (number) and difficulty (valid AnswerDifficulty enum value: 0, 1, or 2).
 * @spec.effects
 * - Validates the request body for presence and type of cardId and difficulty.
 * - Calculates a new due_date based on the difficulty using predefined intervals (1 day for Easy, 10 mins for Hard, 1 min for Wrong).
 * - Executes an UPDATE query on the cards table for the given cardId, setting the new due_date and updating updated_at to NOW().
 * - On successful update (rowCount > 0): Sends a 200 OK response with JSON body { message: "Card review updated successfully" }.
 * - If cardId is not found (rowCount === 0): Sends a 404 Not Found response with JSON body { error: "Card not found for the provided ID" }.
 * - If validation fails: Sends a 400 Bad Request response with JSON body { error: string }.
 * - On database error: Logs the error and sends a 500 Internal Server Error response with JSON body { error: string }.
 * @spec.modifies cards table in the database (updates due_date, updated_at for one row), res object (sends response).
 */
router.post('/update', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/update received with body:`, req.body);
    const { cardId, difficulty } = req.body;

    if (cardId === undefined || typeof cardId !== 'number' || difficulty === undefined) {
        console.warn("[API] POST /api/update - Missing required fields");
        return res.status(400).json({ error: "Missing required fields: cardId (number), difficulty" });
    }
    const numericDifficulty = Number(difficulty);
    if (isNaN(numericDifficulty) || !Object.values(AnswerDifficulty).includes(numericDifficulty)) {
        console.warn(`[API] POST /api/update - Invalid difficulty value: ${difficulty}`);
        return res.status(400).json({ error: `Invalid difficulty level: ${difficulty}` });
    }

    try {
        console.log(`[API /update] Attempting to update card ID: ${cardId} (DB interaction currently active)`);

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
        // NOTE: This part will still fail if the DB is not connected.
        // For the assignment, this endpoint might not be called by the main React app if /api/practice returns no cards.
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
        // If DB connection fails, this catch block will be hit for /api/update
        res.status(500).json({ error: "Failed to update card review (possibly DB issue)" });
    }
});

// ... (rest of your apiRoutes.ts file: /hint, /progress, /day/next, /cards, /create-answer, /get-latest-answer) ...
// (Make sure to include the rest of the file here when you copy it)

/**
 * @name GET /api/hint
 // ... (keep existing /hint logic)
 */
router.get('/hint', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/hint received with query:`, req.query);
    const { cardFront, cardBack } = req.query;

    if (typeof cardFront !== 'string' || typeof cardBack !== 'string' || !cardFront.trim() || !cardBack.trim()) {
        console.warn('[API] GET /api/hint - Missing or invalid query params');
        return res.status(400).json({ error: 'Missing or invalid required query parameters: cardFront, cardBack' });
    }

    try {
        console.log(`[API /hint] Searching for card: Front="${cardFront}", Back="${cardBack}" (DB interaction)`);
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
        res.status(500).json({ error: "Failed to get hint (possibly DB issue)" });
    }
});

/**
 * @name GET /api/progress
  // ... (keep existing /progress logic)
 */
router.get('/progress', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/progress received`);
    try {
        const bucketResult = await pool.query<{ bucket: number; count: string }>(
            `SELECT COALESCE("interval", 0) as bucket, COUNT(*) as count
             FROM cards
             GROUP BY bucket 
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
        res.status(500).json({ error: "Failed to fetch progress data (possibly DB issue)" });
    }
});

/**
 * @name POST /api/day/next
  // ... (keep existing /day/next logic)
 */
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

/**
 * @name POST /api/cards
  // ... (keep existing /cards logic)
 */
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
        res.status(500).json({ error: "Failed to insert card into database (possibly DB issue)" });
    }
});

// --- New Routes for Deployment Assignment (These do NOT use the database) ---
router.post('/create-answer', (req: Request, res: Response) => {
    console.log(`[API] POST /api/create-answer received with body:`, req.body);
    try {
        const data = req.body.data;
        if (typeof data !== 'string' || data.trim() === '') {
            console.warn('[API /create-answer] Invalid request: "data" field is missing, not a string, or empty.');
            return res.status(400).json({ error: 'Invalid request: "data" field must be a non-empty string.' });
        }
        const trimmedData = data.trim();
        setLatestSubmittedData(trimmedData);
        console.log(`[API /create-answer] Stored data: "${trimmedData}"`);
        res.status(201).json({ message: 'Data created successfully.', receivedData: trimmedData });
    } catch (error) {
        console.error("[API] Error in /api/create-answer:", error);
        res.status(500).json({ error: "Failed to process create-answer request." });
    }
});

router.get('/get-latest-answer', (req: Request, res: Response) => {
    console.log(`[API] GET /api/get-latest-answer received`);
    try {
        const latestData = getLatestSubmittedData();
        console.log(`[API /get-latest-answer] Sending latest data: "${latestData}"`);
        res.status(200).json({ latestData: latestData });
    } catch (error) {
        console.error("[API] Error in /api/get-latest-answer:", error);
        res.status(500).json({ error: "Failed to process get-latest-answer request." });
    }
});

export default router;