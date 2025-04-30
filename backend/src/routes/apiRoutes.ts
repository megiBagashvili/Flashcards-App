import express, { Request, Response, Router } from "express";
import pool from "../db";
import * as state from "../state";
import { Flashcard, AnswerDifficulty } from "../logic/flashcards";
import { getHint as calculateHint } from "../logic/algorithm";
import { ProgressStats } from "../types";

const router: Router = express.Router();

//fetch cards for practice session
router.get("/practice", async (req: Request, res: Response) => {
    console.log(`[API] GET /api/practice received`);
    try {
        const currentDay = state.getCurrentDay();
        const result = await pool.query<{
            id: number;
            front: string;
            back: string;
            hint: string | null;
            tags: string[] | null;
        }>(
            `SELECT id, front, back, hint, tags
             FROM cards
             WHERE due_date <= NOW()
             ORDER BY RANDOM()
             LIMIT 10`
        );

        const practiceCards: Flashcard[] = result.rows.map(
            (row) =>
                new Flashcard(row.front, row.back, row.hint ?? "", row.tags ?? [])
        );

        console.log(
            `[API] GET /api/practice - Day ${currentDay}: Found ${practiceCards.length} cards due.`
        );
        res.status(200).json({ cards: practiceCards, day: currentDay });
    } catch (error) {
        console.error("[API] Error fetching practice cards:", error);
        res.status(500).json({ error: "Failed to fetch practice cards" });
    }
});

//update card review status
router.post("/update", async (req: Request, res: Response) => {
    console.log(`[API] POST /api/update received with body:`, req.body);
    const { cardFront, cardBack, difficulty } = req.body;

    //validating input
    if (
        cardFront === undefined ||
        cardBack === undefined ||
        difficulty === undefined
    ) {
        console.warn("[API] POST /api/update - Missing required fields");
        return res.status(400).json({
            error: "Missing required fields: cardFront, cardBack, difficulty",
        });
    }
    const numericDifficulty = Number(difficulty);
    if (!Object.values(AnswerDifficulty).includes(numericDifficulty)) {
        console.warn(
            `[API] POST /api/update - Invalid difficulty value: ${difficulty}`
        );
        return res
            .status(400)
            .json({ error: `Invalid difficulty level: ${difficulty}` });
    }

    try {
        // Finding card id
        console.log(
            `[API /update] Searching for card: Front="${cardFront}", Back="${cardBack}"`
        );
        const findResult = await pool.query<{ id: number }>(
            "SELECT id FROM cards WHERE front = $1 AND back = $2",
            [cardFront, cardBack]
        );

        if (findResult.rows.length === 0) {
            console.warn(`[API /update] Card not found in DB`);
            return res.status(404).json({ error: "Card not found" });
        }
        const cardId = findResult.rows[0].id;
        console.log(`[API /update] Found card ID: ${cardId}`);

        //now calculste new due date
        let newDueDateExpression: string;
        switch (numericDifficulty as AnswerDifficulty) {
            case AnswerDifficulty.Easy:
                newDueDateExpression = "NOW() + interval '1 day'";
                console.log(
                    `[API /update] Difficulty Easy, setting due in 1 day for ID ${cardId}.`
                );
                break;
            case AnswerDifficulty.Hard:
                newDueDateExpression = "NOW() + interval '10 minutes'";
                console.log(
                    `[API /update] Difficulty Hard, setting due in 10 minutes for ID ${cardId}.`
                );
                break;
            case AnswerDifficulty.Wrong:
            default:
                newDueDateExpression = "NOW() + interval '1 minute'";
                console.log(
                    `[API /update] Difficulty Wrong, setting due in 1 minute for ID ${cardId}.`
                );
                break;
        }
        const updateResult = await pool.query(
            `UPDATE cards SET due_date = ${newDueDateExpression}, updated_at = NOW() WHERE id = $1`,
            [cardId]
        );

        if (updateResult.rowCount === 0) {
            console.error(
                `[API /update] Failed to update card ID ${cardId}, rowCount is 0.`
            );
            return res.status(404).json({ error: "Card found but failed to update" });
        }

        console.log(`[API /update] Successfully updated card ID ${cardId}`);
        res.status(200).json({ message: "Card review updated successfully" });

    } catch (error) {
        console.error("[API] Error updating card review:", error);
        res.status(500).json({ error: "Failed to update card review" });
    }
});

//Get hint
router.get("/hint", async (req: Request, res: Response) => {
    console.log(`[API] GET /api/hint received with query:`, req.query);
    const { cardFront, cardBack } = req.query;
    if (
        typeof cardFront !== "string" ||
        typeof cardBack !== "string" ||
        !cardFront ||
        !cardBack
    ) {
        return res.status(400).json({
            error: "Missing required query parameters: cardFront, cardBack",
        });
    }

    try {
        const result = await pool.query<{
            front: string;
            back: string;
            hint: string | null;
            tags: string[] | null;
        }>(
            "SELECT front, back, hint, tags FROM cards WHERE front = $1 AND back = $2",
            [cardFront, cardBack]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Card not found" });
        }

        // Creating flashcard object to pass to hint logic
        const dbRow = result.rows[0];
        const card = new Flashcard(
            dbRow.front,
            dbRow.back,
            dbRow.hint ?? "",
            dbRow.tags ?? []
        );
        const hintText = calculateHint(card);
        console.log(
            `[API] GET /api/hint - Hint generated for "${card.front}": ${hintText}`
        );

        // Sending response
        res.status(200).json({ hint: hintText });

    } catch (error) {
        console.error("[API] Error getting hint:", error);
        res.status(500).json({ error: "Failed to get hint" });
    }
});

//Geting user progress status
router.get("/progress", async (req: Request, res: Response) => {
    console.log(`[API] GET /api/progress received`);
    try {
        const bucketResult = await pool.query<{ interval: number; count: string }>(
            `SELECT "interval", COUNT(*) as count FROM cards GROUP BY "interval" ORDER BY "interval"`
        );
        const bucketDistribution: Record<number, number> = {};
        bucketResult.rows.forEach((row) => {
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
            averageDifficulty,
        };

        console.log("[API] GET /api/progress - Calculated progress:", progressStats);
        res.status(200).json(progressStats);

    } catch (error) {
        console.error("[API] Error fetching progress:", error);
        res.status(500).json({ error: "Failed to fetch progress data" });
    }
});

//logic of advancing to the next day
router.post("/day/next", (req: Request, res: Response) => {
    console.log(`[API] POST /api/day/next received`);
    try {
        state.incrementDay();
        const newDay = state.getCurrentDay();
        console.log(`[API] POST /api/day/next - Advanced to Day ${newDay}`);
        res
            .status(200)
            .json({ message: `Advanced to day ${newDay}`, currentDay: newDay });
    } catch (error) {
        console.error("[API] Error advancing day:", error);
        res.status(500).json({ error: "Failed to advance day" });
    }
});

//Creating a new card
router.post("/cards", async (req: Request, res: Response) => {
    console.log(`[API] POST /api/cards received with body:`, req.body);
    const { front, back, hint, tags } = req.body;
    if (!front || typeof front !== "string" || front.trim() === "") {
        return res
            .status(400)
            .json({ error: "Missing or invalid required field: front (string)" });
    }
    if (!back || typeof back !== "string" || back.trim() === "") {
        return res
            .status(400)
            .json({ error: "Missing or invalid required field: back (string)" });
    }
    const hintValue = hint && typeof hint === "string" ? hint.trim() : null;
    const tagsValue =
        Array.isArray(tags) && tags.every((t) => typeof t === "string")
            ? tags.length > 0 ? tags : null
            : null;

    try {
        const insertQuery = `INSERT INTO cards (front, back, hint, tags) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const values = [front.trim(), back.trim(), hintValue, tagsValue];
        const result = await pool.query(insertQuery, values);

        if (result.rows.length > 0) {
            const newCard = result.rows[0];
            console.log(
                `[API] POST /api/cards - Successfully inserted card ID ${newCard.id}`
            );
            res.status(201).json(newCard);
        } else {
            console.error(
                "[API] POST /api/cards - Insert query succeeded but returned no rows."
            );
            res
                .status(500)
                .json({ error: "Failed to create card (no data returned)" });
        }
    } catch (error) {
        console.error("[API] Error inserting card:", error);
        res.status(500).json({ error: "Failed to insert card into database" });
    }
});

export default router;
