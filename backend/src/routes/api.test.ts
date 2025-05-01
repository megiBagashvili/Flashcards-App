/**
 * @file backend/src/routes/api.test.ts
 * @description Integration tests for the backend API endpoints.
 * Uses Jest as the test runner and Supertest for making HTTP requests
 * to the Express application instance. Interacts with a PostgreSQL
 * database via the imported pool for setting up test data and
 * verifying results.
 */

import request from 'supertest'; //Library for making HTTP requests against an Express app
import app from '../server';//Express application instance
import pool from '../db';//PostgreSQL connection pool
import pg from 'pg';
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import * as state from '../state';//Used for testing state-dependent routes like /day/next


/**
 * @function beforeAll
 * @description Jest hook that runs once before all tests in this file.
 * Used here to perform an initial check that the database pool can connect.
 * @param {Function} callback - The async function containing the setup logic.
 * @effects Attempts a simple query to verify DB connectivity. Logs success or failure.
 */

beforeAll(async () => {
    try {
        await pool.query('SELECT 1');
        console.log("Test DB Pool seems connected");
    } catch (error) {
        console.error("Failed initial pool query check", error);
    }
});


/**
 * @function afterAll
 * @description Jest hook that runs once after all tests in this file have completed.
 * Used here to close the database connection pool.
 * @param {Function} callback - The async function containing the teardown logic.
 * @effects Calls pool.end() to close all connections in the pool. Logs confirmation.
 * @modifies pool state (closes connections).
 */

afterAll(async () => {
    await pool.end();
    console.log("DB pool closed");
});


/**
 * @function beforeEach
 * @description Jest hook that runs before each individual test case
 * Used here to ensure a clean database state for each test by deleting all rows
 * from the cards table.
 * @param {Function} callback - The async function containing the per-test setup logic.
 * @effects Executes DELETE FROM cards. Logs start message or error if deletion fails.
 * @modifies cards table in the database.
 */
beforeEach(async () => {
    try {
        await pool.query('DELETE FROM cards');
        console.log('--- Test START (DELETE FROM cards completed) ---');
    } catch (error) {
        console.error("Failed to DELETE FROM cards in beforeEach", error);
        throw error;
    }
});

/**
 * @function afterEach
 * @description Jest hook that runs after each individual test case
 * Used here primarily for logging the end of a test case
 * @param {Function} callback - The async function containing the per-test teardown logic
 * @effects Logs an end message to the console
 */

afterEach(async () => {
     console.log('--- Test END ---');
});

/**
 * @describe Flashcard API Endpoints
 * @description Groups all integration tests related to the flashcard API routes.
 */

describe('Flashcard API Endpoints', () => {

    /**
     * @describe GET /api/practice
     * @description Tests for the endpoint that fetches cards due for practice.
     */
    describe('GET /api/practice', () => {
        /**
         * @it should return status 200 and only due cards
         * @description Verifies that the endpoint correctly returns only cards whose `due_date` is in the past or present, ignoring future cards. 
         * Checks status code, response array length, and basic content of the returned card.
         * @effects Inserts one due card and one future card into the DB. Sends a GET request to `/api/practice`. 
         * Asserts response status and content.
         */
        it('should return status 200 and only due cards', async () => {
            await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour')`, ['Practice Due', 'Practice Back Due']);
            await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '7 days')`, ['Practice Future', 'Practice Back Future']);
            
            const response = await request(app).get('/api/practice');
            
            expect(response.statusCode).toBe(200);
            expect(response.body.cards).toHaveLength(1); 
            const foundCard = response.body.cards.find((c: Flashcard) => c.front === 'Practice Due');
            expect(foundCard).toBeDefined();
            expect(foundCard!.back).toBe('Practice Back Due');
        });

        /**
         * @it should return an empty cards array if no cards are due
         * @description Verifies that the endpoint returns an empty array when all cards in the database have a 
         * future due_date.
         * @effects Inserts only a future card. Sends a GET request to '/api/practice'. 
         * Asserts response status and that the cards array is empty.
         */
         it('should return an empty cards array if no cards are due', async () => {
             await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '7 days')`, ['Future Card Only', 'Future Back Only']);
             const response = await request(app).get('/api/practice');
             expect(response.statusCode).toBe(200);
             expect(response.body.cards).toHaveLength(0);
         });
    });

    /**
     * @describe POST /api/update
     * @description Tests for the endpoint that updates a card's review status
     */
    describe('POST /api/update', () => {
        /**
         * @it should return status 200 and update due_date for existing card
         * @description Verifies that sending 'difficulty: Easy' correctly updates the card's due_date
         * to approximately 1 day from now.
         * @effects Inserts a card. Sends a POST request to /api/update with the card's ID and difficulty: Easy. 
         * Queries the DB to verify the due_date was updated correctly within a tolerance.
         */
        it('should return status 200 and update due_date for existing card (Easy)', async () => {
            const insertRes = await pool.query( 
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour') RETURNING id`, 
                ['Update Easy', 'Update Back Easy']
            );
            const cardId = insertRes.rows[0].id;
            
            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Update Easy', cardBack: 'Update Back Easy', difficulty: AnswerDifficulty.Easy });
            
            expect(response.statusCode).toBe(200);

            const verifyRes = await pool.query('SELECT due_date FROM cards WHERE id = $1', [cardId]); 
            expect(verifyRes.rows.length).toBe(1);
            
            const newDueDate = new Date(verifyRes.rows[0].due_date);
            const expectedDueDateTimestamp = Date.now() + (24 * 60 * 60 * 1000);
            const tolerance = 15000;

            expect(newDueDate.getTime()).toBeGreaterThanOrEqual(expectedDueDateTimestamp - tolerance);
            expect(newDueDate.getTime()).toBeLessThanOrEqual(expectedDueDateTimestamp + tolerance);
        });

        /**
         * @it should return 404 if card to update is not found
         * @description Verifies that the endpoint returns a 404 status code if the provided cardId 
         * does not exist in the database.
         * @effects Sends a POST request to /api/update with a non-existent cardId. 
         * Asserts the response status code is 404.
         */
        it('should return 404 if card to update is not found', async () => {
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'NonExistent', cardBack: 'NonExistent', difficulty: AnswerDifficulty.Hard });
             expect(response.statusCode).toBe(404);
        });

        /**
         * @it should return 400 if difficulty is missing
         * @description Verifies that the endpoint returns a 400 status code if the difficulty field is missing from the request body.
         * @effects Inserts a card. Sends a POST request to /api/update without difficulty. Asserts response status code is 400 and checks error message.
         */
        it('should return 400 if difficulty is missing', async () => {
             await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid')`);
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'Update Invalid', cardBack: 'Update Back Invalid' });
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields');
        });
        /**
         * @it should return 400 if difficulty is invalid
         * @description Verifies that the endpoint returns a 400 status code if the provided difficulty value is not a valid AnswerDifficulty enum member.
         * @effects Inserts a card. Sends a POST request to /api/update with an invalid numeric difficulty. Asserts response status code is 400 and checks error message.
         */
        it('should return 400 if difficulty is invalid', async () => {
            await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid')`);
            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Update Invalid', cardBack: 'Update Back Invalid', difficulty: 99 });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid difficulty level');
        });
    });

    /**
     * @describe GET /api/hint
     * @description Tests for the endpoint that provides hints for cards.
     */
    describe('GET /api/hint', () => {
        /**
         * @it should return 200 and the specific or default hint
         * @description Verifies that the endpoint returns the card's specific hint if it exists, otherwise generates and returns a default hint.
         * @effects Inserts two cards, one with a hint, one without. Sends GET requests to /api/hint for both cards. Asserts status code and the correct hint text in each response.
         */
        it('should return 200 and the specific or default hint', async () => {
            await pool.query( `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`, ['Hint Front', 'Hint Back', 'Specific Hint Here']);
            await pool.query( `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`, ['No Hint Front', 'No Hint Back', null]);
            
            const responseWithHint = await request(app).get('/api/hint?cardFront=Hint Front&cardBack=Hint Back');
            expect(responseWithHint.statusCode).toBe(200);
            expect(responseWithHint.body).toEqual({ hint: 'Specific Hint Here' });
            
            const responseDefaultHint = await request(app).get('/api/hint?cardFront=No Hint Front&cardBack=No Hint Back');
            expect(responseDefaultHint.statusCode).toBe(200);
            expect(responseDefaultHint.body.hint).toContain('Think about the key concepts related to No Hint Front'); 
        });
        /**
         * @it should return 404 if card for hint is not found
         * @description Verifies that the endpoint returns 404 if no card matches the provided cardFront and cardBack.
         * @effects Sends a GET request to /api/hint with non-existent card details. Asserts response status code is 404.
         */
        it('should return 404 if card for hint is not found', async () => {
            const response = await request(app).get('/api/hint?cardFront=NoExist&cardBack=NoExist');
            expect(response.statusCode).toBe(404);
        });
        /**
         * @it should return 400 if query parameters are missing
         * @description Verifies that the endpoint returns 400 if either cardFron or cardBack query parameter is missing.
         * @effects Sends a GET request to /api/hint missing the cardBack parameter. Asserts response status code is 400.
         */
        it('should return 400 if query parameters are missing', async () => {
            const response = await request(app).get('/api/hint?cardFront=OnlyFront');
            expect(response.statusCode).toBe(400);
        });
    });
    /**
     * @describe GET /api/progress
     * @description Tests for the endpoint that returns learning progress statistics.
     */
    describe('GET /api/progress', () => {
        /**
         * @it should return 200 and correct progress stats object
         * @description Verifies that the endpoint correctly calculates the bucketDistribution based on the interval column in the database. Checks placeholder values for other stats.
         * @effects Inserts cards with different interval values. Sends a GET request to /api/progress. Asserts status code and the structure/content of the returned stats object.
         */
        it('should return 200 and correct progress stats object', async () => {
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F1','B1', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F2','B2', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F3','B3', 2)`);
             
             const response = await request(app).get('/api/progress');
             
             expect(response.statusCode).toBe(200);
             expect(response.body.accuracyRate).toBe(0);
             expect(response.body.averageDifficulty).toBeUndefined();
             expect(response.body.bucketDistribution).toEqual({ '0': 2, '2': 1 });
        });
        /**
         * @it should return default stats if no cards exist
         * @description Verifies that the endpoint returns default/empty statistics when the cards table is empty.
         * @effects Sends a GET request to /api/progress. Asserts status code and default values in the response.
         */        
        it('should return default stats if no cards exist', async () => {
             const response = await request(app).get('/api/progress');
             expect(response.statusCode).toBe(200);
             expect(response.body.bucketDistribution).toEqual({});
             expect(response.body.accuracyRate).toBe(0);
             expect(response.body.averageDifficulty).toBeUndefined();
        });
    });
     /**
     * @describe POST /api/day/next
     * @description Tests for the endpoint that increments the in-memory day counter.
     */
     describe('POST /api/day/next', () => {
         let initialDayBeforeTest: number;

         beforeEach(() => {
             initialDayBeforeTest = state.getCurrentDay(); 
         });

         afterEach(() => {
         });
         
         /**
          * @it should return 200 and the incremented day number
          * @description Verifies that the endpoint increments the day counter in state.ts and returns the new day number.
          * @effects Records the current day. Sends a POST request to /api/day/next. Asserts status code and that the returned currentDay is one greater than the initial day. Also verifies the state module's internal counter was updated.
          */
         it('should return 200 and the incremented day number', async () => {
             const initialDay = state.getCurrentDay();
             const response = await request(app).post('/api/day/next');
             expect(response.statusCode).toBe(200);
             expect(response.body.currentDay).toBe(initialDay + 1);
             expect(state.getCurrentDay()).toBe(initialDay + 1); 
         });
     });
     /**
     * @describe POST /api/cards
     * @description Tests for the endpoint that creates new flashcards.
     */
    describe('POST /api/cards', () => {
         /**
          * @it should return 201 and the created card data with defaults
          * @description Verifies that a new card can be created with only front/back provided, and that the response includes the full card data with database defaults (ID, null hint/tags, default SRS values, timestamps). Also verifies the card exists in the DB.
          * @effects Sends a POST request to /api/cards with minimal data. Asserts status code 201 and checks properties of the returned card object. Queries the DB to confirm insertion.
          */
         it('should return 201 and the created card data with defaults', async () => {
             const newCardData = { front: 'Create Front', back: 'Create Back' };
             const response = await request(app).post('/api/cards').send(newCardData);
             
             expect(response.statusCode).toBe(201);
             expect(response.body).toHaveProperty('id');
             expect(response.body.front).toBe(newCardData.front);
             expect(response.body.back).toBe(newCardData.back);
             expect(response.body.hint).toBeNull(); 
             expect(response.body.tags).toBeNull(); 
             expect(response.body.interval).toBe(0);
             expect(response.body.ease_factor).toBe(2.5);
             expect(response.body.due_date).toBeDefined();
             const verifyRes = await pool.query('SELECT * FROM cards WHERE id = $1', [response.body.id]);
             expect(verifyRes.rows.length).toBe(1);
             expect(verifyRes.rows[0].front).toBe(newCardData.front);
         });
         /**
          * @it should return 201 when hint and tags are provided
          * @description Verifies that a new card can be created with optional hint and tags, and that these values are correctly stored and returned.
          * @effects Sends a POST request to /api/cards including hint and tags. Asserts status code 201 and checks that the returned hint and tags match the input.
          */
         it('should return 201 when hint and tags are provided', async () => {
             const newCardData = { front: 'Create Front 2', back: 'Create Back 2', hint: "A Hint", tags: ["tag1", "tag2"] };
             const response = await request(app).post('/api/cards').send(newCardData);
             
             expect(response.statusCode).toBe(201);
             expect(response.body.hint).toBe(newCardData.hint);
             expect(response.body.tags).toEqual(newCardData.tags);
         });
         /**
          * @it should return 400 if front or back is missing
          * @description Verifies that the endpoint returns 400 Bad Request if either the required front or back field is missing from the request body.
          * @effects Sends two POST requests to /api/cards, one missing front, one missing back. Asserts status code is 400 for both and checks the error messages.
          */
         it('should return 400 if front or back is missing', async () => {
             const res1 = await request(app).post('/api/cards').send({ back: 'Only Back' });
             expect(res1.statusCode).toBe(400);
             expect(res1.body.error).toContain('Missing or invalid required field: front');
             
             const res2 = await request(app).post('/api/cards').send({ front: 'Only Front' });
             expect(res2.statusCode).toBe(400);
             expect(res2.body.error).toContain('Missing or invalid required field: back');
         });
    });

});
