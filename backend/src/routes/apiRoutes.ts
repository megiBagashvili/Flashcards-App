import express, { Request, Response, Router } from 'express';
import pool from '../db';
import * as state from '../state';
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import { getHint as calculateHint } from '../logic/algorithm';
import { ProgressStats } from '../types';

const router: Router = express.Router();

// API Route Handlers

/**
 * @name GET /api/practice
 * @description Fetches a list of flashcards due for practice for the current day.
 * @route GET /api/practice
 * @param {Request} req The Express request object. No parameters or body expected.
 * @param {Response} res The Express response object used to send back the practice session data or an error.
 * @returns {Promise<void>}
 *
 * @spec.requires Database pool is connected and the cards table exists. state.getCurrentDay() returns the current day number.
 * @spec.effects
 * - Reads the current day from state.
 * - Queries the database for up to 10 cards where due_date is less than or equal to the current time (NOW()), ordered randomly.
 * - Constructs an array of plain card data objects, including id, front, back, hint, tags, due_date (as ISO string).
 * - On success: Sends a 200 OK response with a JSON body { cards: BackendCardType[], day: number }.
 * - On database error: Logs the error and sends a 500 Internal Server Error response with JSON body { error: string }.
 * @spec.modifies res object (sends response).
 */
router.get('/practice', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/practice received`);
    try {
        const currentDay = state.getCurrentDay();

        const result = await pool.query<{ id: number; front: string; back: string; hint: string | null; tags: string[] | null; due_date: Date }>(
            `SELECT id, front, back, hint, tags, due_date
             FROM cards
             WHERE due_date <= NOW()
             ORDER BY RANDOM() -- Randomize order for variety; consider 'ORDER BY due_date ASC' for priority
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

/**
 * @name GET /api/hint
 * @description Retrieves a hint for a specific flashcard, identified by its front and back text.
 * @route GET /api/hint
 * @param {Request} req The Express request object. Expects query parameters cardFront (string) and cardBack (string).
 * @param {Response} res The Express response object used to send back the hint or an error.
 * @returns {Promise<void>}
 *
 * @spec.requires Database pool is connected and the cards table exists. req.query contains non-empty cardFront and cardBack strings. logic/algorithm.ts contains a getHint function.
 * @spec.effects
 * - Validates the presence and type of query parameters.
 * - Queries the database for a card matching the trimmed cardFront and cardBack.
 * - If card found: Creates a Flashcard object (from logic/flashcards) and calls calculateHint to get the hint text. Sends a 200 OK response with JSON body { hint: string }.
 * - If card not found: Sends a 404 Not Found response with JSON body { error: "Card not found" }.
 * - If validation fails: Sends a 400 Bad Request response with JSON body { error: string }.
 * - On database error: Logs the error and sends a 500 Internal Server Error response with JSON body { error: string }.
 * @spec.modifies res object (sends response).
 */
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

/**
 * @name GET /api/progress
 * @description Retrieves statistics about learning progress, primarily the distribution of cards across learning intervals (buckets).
 * @route GET /api/progress
 * @param {Request} req The Express request object. No parameters or body expected.
 * @param {Response} res The Express response object used to send back progress statistics or an error.
 * @returns {Promise<void>}
 *
 * @spec.requires Database pool is connected and the cards table exists with an interval column. types/index.ts defines ProgressStats interface.
 * @spec.effects
 * - Queries the database to count cards grouped by their interval value (treating NULL intervals as 0).
 * - Constructs a bucketDistribution object mapping interval number to card count.
 * - Sets placeholder values for accuracyRate (0) and averageDifficulty (undefined).
 * - On success: Sends a 200 OK response with a JSON body conforming to ProgressStats (omitting averageDifficulty if undefined).
 * - On database error: Logs the error and sends a 500 Internal Server Error response with JSON body { error: string }.
 * @spec.modifies res object (sends response).
 */
router.get('/progress', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/progress received`);
    try {
        const bucketResult = await pool.query<{ bucket: number; count: string }>(
            `SELECT COALESCE("interval", 0) as bucket, COUNT(*) as count
             FROM cards
             GROUP BY bucket -- Group by the calculated bucket alias
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

/**
 * @name POST /api/day/next
 * @description Increments the application's internal day counter.
 * @route POST /api/day/next
 * @param {Request} req The Express request object. No body or parameters expected.
 * @param {Response} res The Express response object used to send back the new day number or an error.
 * @returns {void} (Synchronous handler)
 *
 * @spec.requires state.incrementDay and state.getCurrentDay functions exist and operate on an in-memory day counter.
 * @spec.effects Calls state.incrementDay() to modify the in-memory day counter. Calls state.getCurrentDay() to get the new value. Sends a 200 OK response with JSON body { message: string, currentDay: number }.
 * @spec.modifies In-memory day counter via state.ts, res object (sends response).
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
 * @description Creates a new flashcard in the database.
 * @route POST /api/cards
 * @param {Request} req The Express request object. Expects a JSON body containing front (string, required), back (string, required), hint (string, optional), tags (string[], optional).
 * @param {Response} res The Express response object used to send back the newly created card data or an error.
 * @returns {Promise<void>}
 *
 * @spec.requires Database pool is connected and the cards table exists with columns front, back, hint, tags, due_date, created_at, updated_at. req.body contains valid front and back strings.
 * @spec.effects
 * - Validates front and back fields in the request body.
 * - Sanitizes optional hint and tags fields.
 * - Executes an INSERT query into the cards table with the provided data, setting due_date, created_at, updated_at to NOW().
 * - Uses RETURNING * to get the newly created row data.
 * - On successful insert: Sends a 201 Created response with the full new card object (including database-generated id) as JSON.
 * - If validation fails: Sends a 400 Bad Request response with JSON body { error: string }.
 * - On database error (e.g., unique constraint violation, connection issue): Logs the error and sends a 500 Internal Server Error response with JSON body { error: string }.
 * @spec.modifies cards table in the database (inserts one row), res object (sends response).
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
            VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW()) -- Set defaults on insert
            RETURNING *; -- Return the complete inserted row
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

/**
 * @name POST /api/create-answer
 * @description Endpoint for the deployment assignment. Accepts text data and stores it.
 * (Placeholder implementation - logic to be added in D1-C1-S3)
 * @route POST /api/create-answer
 * @param {Request} req The Express request object. Expects JSON body: { "data": "some text here" }.
 * @param {Response} res The Express response object.
 * @returns {Promise<void>}
 */
router.post('/create-answer', async (req: Request, res: Response) => {
    console.log(`[API] POST /api/create-answer received with body:`, req.body);
    // Logic to validate req.body.data and store it will be added in D1-C1-S2/S3
    try {
        // Placeholder logic for now
        const data = req.body.data;
        if (typeof data !== 'string') {
            return res.status(400).json({ error: 'Invalid request body: "data" field must be a string.' });
        }
        console.log(`[API /create-answer] Received data: "${data}" - (Logic to store it TBD)`);
        res.status(201).json({ message: 'Answer received successfully (placeholder).', receivedData: data });
    } catch (error) {
        console.error("[API] Error in /api/create-answer:", error);
        res.status(500).json({ error: "Failed to process create-answer request." });
    }
});

/**
 * @name GET /api/get-latest-answer
 * @description Endpoint for the deployment assignment. Retrieves the most recently stored answer.
 * (Placeholder implementation - logic to be added in D1-C1-S4)
 * @route GET /api/get-latest-answer
 * @param {Request} req The Express request object.
 * @param {Response} res The Express response object.
 * @returns {Promise<void>}
 */
router.get('/get-latest-answer', async (req: Request, res: Response) => {
    console.log(`[API] GET /api/get-latest-answer received`);
    // Logic to retrieve the stored answer will be added in D1-C1-S2/S4
    try {
        // Placeholder logic for now
        const latestData = "Placeholder: This is the latest answer from backend."; // This will come from the storage mechanism
        console.log(`[API /get-latest-answer] Sending latest data: "${latestData}" - (Logic to retrieve it TBD)`);
        res.status(200).json({ latestData: latestData });
    } catch (error) {
        console.error("[API] Error in /api/get-latest-answer:", error);
        res.status(500).json({ error: "Failed to process get-latest-answer request." });
    }
});


export default router;
