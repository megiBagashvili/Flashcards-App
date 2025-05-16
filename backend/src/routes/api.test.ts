/**
 * @file backend/src/routes/api.test.ts
 * @description Integration tests for the backend API endpoints.
 * Uses Jest as the test runner and Supertest for making HTTP requests
 * to the Express application instance. Interacts with a PostgreSQL
 * database via the imported pool for setting up test data and
 * verifying results. Also tests in-memory store for assignment endpoints.
 */

import request from 'supertest'; // Library for making HTTP requests against an Express app
import app from '../server'; // The Express application instance
import pool from '../db'; // The PostgreSQL connection pool
// pg import is not strictly used directly in this file, but often kept for type awareness or direct client use if needed.
import pg from 'pg';
import { Flashcard, AnswerDifficulty } from '../logic/flashcards'; // Types used in tests
import * as state from '../state'; // Used for testing state-dependent routes like /day/next
// Import functions from assignmentStore for resetting state in tests
import { setLatestSubmittedData, getLatestSubmittedData } from '../assignmentStore';


/**
 * @function beforeAll
 * @description Jest hook that runs once before all tests in this file.
 * Used here to perform an initial check that the database pool can connect.
 * @param {Function} callback - The async function containing the setup logic.
 * @effects Attempts a simple query (SELECT 1) to verify DB connectivity. Logs success or failure.
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
 * Used here to close the database connection pool gracefully.
 * @param {Function} callback - The async function containing the teardown logic.
 * @effects Calls pool.end() to close all connections in the pool. Logs confirmation.
 * @modifies pool state (closes connections).
 */
afterAll(async () => {
    await pool.end();
    console.log("DB pool closed");
});

/**
 * @function beforeEach (Top Level)
 * @description Jest hook that runs before each individual test case (it block) across all describe blocks in this file.
 * Used here to ensure a clean database state for each test by deleting all rows
 * from the cards table. This is for tests interacting with the main flashcard functionality.
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
 * @function afterEach (Top Level)
 * @description Jest hook that runs after each individual test case (it block) across all describe blocks.
 * Used here primarily for logging the end of a test case.
 * @param {Function} callback - The async function containing the per-test teardown logic.
 * @effects Logs an end message to the console.
 */
afterEach(async () => {
     console.log('--- Test END ---');
});

/**
 * @describe Flashcard API Endpoints
 * @description Groups all integration tests related to the main flashcard API routes.
 */
describe('Flashcard API Endpoints', () => {

    /**
     * @describe GET /api/practice
     * @description Tests for the endpoint that fetches cards due for practice.
     */
    describe('GET /api/practice', () => {
        /**
         * @it should return status 200 and only due cards
         * @description Verifies that the endpoint correctly returns only cards whose due_date is in the past or present, ignoring future cards. Checks status code, response array length, and basic content of the returned card.
         * @effects Inserts one due card and one future card into the DB. Sends a GET request to /api/practice. Asserts response status and content.
         */
        it('should return status 200 and only due cards', async () => {
            // Arrange: Insert one card due now, one due later
            await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour')`, ['Practice Due', 'Practice Back Due']);
            await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '7 days')`, ['Practice Future', 'Practice Back Future']);

            // Act: Call the API endpoint
            const response = await request(app).get('/api/practice');

            // Assert: Check status code and response body
            expect(response.statusCode).toBe(200);
            expect(response.body.cards).toHaveLength(1); // Only the due card should be returned
            const foundCard = response.body.cards.find((c: Flashcard) => c.front === 'Practice Due');
            expect(foundCard).toBeDefined();
            expect(foundCard!.back).toBe('Practice Back Due');
        });

        /**
         * @it should return an empty cards array if no cards are due
         * @description Verifies that the endpoint returns an empty array when all cards in the database have a future due_date.
         * @effects Inserts only a future card. Sends a GET request to /api/practice. Asserts response status and that the cards array is empty.
         */
         it('should return an empty cards array if no cards are due', async () => {
             // Arrange: Insert only a future card
             await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '7 days')`, ['Future Card Only', 'Future Back Only']);

             // Act: Call the API endpoint
             const response = await request(app).get('/api/practice');

             // Assert: Check status code and response body
             expect(response.statusCode).toBe(200);
             expect(response.body.cards).toHaveLength(0);
         });
    });

    /**
     * @describe POST /api/update
     * @description Tests for the endpoint that updates a card's review status (specifically due_date).
     * Note: These tests reflect the simplified SRS logic currently in apiRoutes.ts (only updating due_date).
     */
    describe('POST /api/update', () => {
        /**
         * @it should return status 200 and update due_date for existing card (Easy)
         * @description Verifies that sending difficulty: Easy correctly updates the card's due_date to approximately 1 day from now.
         * @effects Inserts a card. Sends a POST request to /api/update with the card's ID and difficulty: Easy. Queries the DB to verify the due_date was updated correctly within a tolerance.
         */
        it('should return status 200 and update due_date for existing card (Easy)', async () => {
            // Arrange: Insert a card and get its ID
            const insertRes = await pool.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour') RETURNING id`,
                ['Update Easy', 'Update Back Easy']
            );
            const cardId = insertRes.rows[0].id;

            // Act: Call the API endpoint with Easy difficulty
            // Note: The API expects cardId, not cardFront/cardBack for this version
            const response = await request(app)
                .post('/api/update')
                .send({ cardId: cardId, difficulty: AnswerDifficulty.Easy });

            // Assert: Check status and database state
            expect(response.statusCode).toBe(200);
            const verifyRes = await pool.query('SELECT due_date FROM cards WHERE id = $1', [cardId]);
            expect(verifyRes.rows.length).toBe(1);

            // Verify due date is roughly 1 day from now
            const newDueDate = new Date(verifyRes.rows[0].due_date);
            const expectedDueDateTimestamp = Date.now() + (24 * 60 * 60 * 1000); // Target: now + 1 day
            const tolerance = 15000; // Allow 15 seconds tolerance
            expect(newDueDate.getTime()).toBeGreaterThanOrEqual(expectedDueDateTimestamp - tolerance);
            expect(newDueDate.getTime()).toBeLessThanOrEqual(expectedDueDateTimestamp + tolerance);
        });

         /**
         * @it should return 404 if card to update is not found
         * @description Verifies that the endpoint returns a 404 status code if the provided cardId does not exist in the database.
         * @effects Sends a POST request to /api/update with a non-existent cardId. Asserts the response status code is 404.
         */
        it('should return 404 if card to update is not found', async () => {
             // Arrange: No card needed, just use an invalid ID
             const nonExistentCardId = 999999;

             // Act: Call the API endpoint
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardId: nonExistentCardId, difficulty: AnswerDifficulty.Hard });

             // Assert: Check status code
             expect(response.statusCode).toBe(404);
        });
        
        /**
         * @it should return 400 if cardId is missing
         * @description Verifies that the endpoint returns a 400 status code if the cardId field is missing from the request body.
         * @effects Sends a POST request to /api/update without cardId. Asserts response status code is 400 and checks error message.
         */
        it('should return 400 if cardId is missing', async () => {
             // Act: Call the API endpoint without cardId
             const response = await request(app)
                 .post('/api/update')
                 .send({ difficulty: AnswerDifficulty.Easy }); // Missing cardId

             // Assert: Check status and error message
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields: cardId (number), difficulty');
        });


        /**
         * @it should return 400 if difficulty is missing
         * @description Verifies that the endpoint returns a 400 status code if the difficulty field is missing from the request body.
         * @effects Inserts a card. Sends a POST request to /api/update without difficulty. Asserts response status code is 400 and checks error message.
         */
        it('should return 400 if difficulty is missing', async () => {
             // Arrange: Insert a card and get its ID
             const insertRes = await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid') RETURNING id`);
             const cardId = insertRes.rows[0].id;

             // Act: Call the API endpoint without difficulty
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardId: cardId }); // Missing difficulty

             // Assert: Check status and error message
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields: cardId (number), difficulty');
        });

        /**
         * @it should return 400 if difficulty is invalid
         * @description Verifies that the endpoint returns a 400 status code if the provided difficulty value is not a valid AnswerDifficulty enum member.
         * @effects Inserts a card. Sends a POST request to /api/update with an invalid numeric difficulty. Asserts response status code is 400 and checks error message.
         */
        it('should return 400 if difficulty is invalid', async () => {
            // Arrange: Insert a card and get its ID
            const insertRes = await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid') RETURNING id`);
            const cardId = insertRes.rows[0].id;

            // Act: Call the API endpoint with an invalid difficulty value
            const response = await request(app)
                .post('/api/update')
                .send({ cardId: cardId, difficulty: 99 }); // Invalid difficulty

            // Assert: Check status and error message
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
         * @effects Inserts two cards (one with a hint, one without). Sends GET requests to /api/hint for both cards. Asserts status code and the correct hint text in each response.
         */
        it('should return 200 and the specific or default hint', async () => {
            // Arrange: Insert cards with and without specific hints
            await pool.query( `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`, ['Hint Front', 'Hint Back', 'Specific Hint Here']);
            await pool.query( `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`, ['No Hint Front', 'No Hint Back', null]);

            // Act & Assert for card with hint
            const responseWithHint = await request(app).get('/api/hint?cardFront=Hint Front&cardBack=Hint Back');
            expect(responseWithHint.statusCode).toBe(200);
            expect(responseWithHint.body).toEqual({ hint: 'Specific Hint Here' });

            // Act & Assert for card without hint (expecting default)
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
            // Act: Request hint for a non-existent card
            const response = await request(app).get('/api/hint?cardFront=NoExist&cardBack=NoExist');
            // Assert: Check status code
            expect(response.statusCode).toBe(404);
        });

        /**
         * @it should return 400 if query parameters are missing
         * @description Verifies that the endpoint returns 400 if either cardFront or cardBack query parameter is missing.
         * @effects Sends a GET request to /api/hint missing the cardBack parameter. Asserts response status code is 400.
         */
        it('should return 400 if query parameters are missing', async () => {
            // Act: Request hint with missing parameter
            const response = await request(app).get('/api/hint?cardFront=OnlyFront'); // Missing cardBack
            // Assert: Check status code
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
             // Arrange: Insert cards with different intervals
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F1','B1', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F2','B2', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F3','B3', 2)`);

             // Act: Call the API endpoint
             const response = await request(app).get('/api/progress');

             // Assert: Check status and response body structure
             expect(response.statusCode).toBe(200);
             expect(response.body.accuracyRate).toBe(0); // Placeholder
             expect(response.body.averageDifficulty).toBeUndefined(); // Placeholder
             expect(response.body.bucketDistribution).toEqual({ '0': 2, '2': 1 }); // Based on interval
        });

        /**
         * @it should return default stats if no cards exist
         * @description Verifies that the endpoint returns default/empty statistics when the cards table is empty.
         * @effects Sends a GET request to /api/progress (database is empty due to beforeEach). Asserts status code and default values in the response.
         */
        it('should return default stats if no cards exist', async () => {
             // Arrange: DB is empty due to beforeEach

             // Act: Call the API endpoint
             const response = await request(app).get('/api/progress');

             // Assert: Check status and default response values
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
         // State management for day counter tests
         let initialDayBeforeTest: number;
         beforeEach(() => {
             // Record the day before the test runs
             initialDayBeforeTest = state.getCurrentDay();
         });
         // Note: No afterEach needed to reset day if sequential increments are acceptable for testing

         /**
          * @it should return 200 and the incremented day number
          * @description Verifies that the endpoint increments the day counter in state.ts and returns the new day number.
          * @effects Records the current day. Sends a POST request to /api/day/next. Asserts status code and that the returned currentDay is one greater than the initial day. Also verifies the state module's internal counter was updated.
          */
         it('should return 200 and the incremented day number', async () => {
             // Arrange: Get the day number before the API call
             const initialDay = state.getCurrentDay();

             // Act: Call the API endpoint
             const response = await request(app).post('/api/day/next');

             // Assert: Check status, response body, and internal state
             expect(response.statusCode).toBe(200);
             expect(response.body.currentDay).toBe(initialDay + 1);
             expect(state.getCurrentDay()).toBe(initialDay + 1); // Verify state module directly
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
             // Arrange: Define minimal card data
             const newCardData = { front: 'Create Front', back: 'Create Back' };

             // Act: Call the API endpoint
             const response = await request(app).post('/api/cards').send(newCardData);

             // Assert: Check status and response body properties
             expect(response.statusCode).toBe(201);
             expect(response.body).toHaveProperty('id');
             expect(response.body.front).toBe(newCardData.front);
             expect(response.body.back).toBe(newCardData.back);
             expect(response.body.hint).toBeNull();
             expect(response.body.tags).toBeNull();
             expect(response.body.interval).toBe(0); // Default from schema
             expect(response.body.ease_factor).toBe(2.5); // Default from schema
             expect(response.body.due_date).toBeDefined();

             // Assert: Verify directly in DB
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
             // Arrange: Define card data with optional fields
             const newCardData = { front: 'Create Front 2', back: 'Create Back 2', hint: "A Hint", tags: ["tag1", "tag2"] };

             // Act: Call the API endpoint
             const response = await request(app).post('/api/cards').send(newCardData);

             // Assert: Check status and optional fields in response
             expect(response.statusCode).toBe(201);
             expect(response.body.hint).toBe(newCardData.hint);
             expect(response.body.tags).toEqual(newCardData.tags); // Use toEqual for array comparison
         });

         /**
          * @it should return 400 if front or back is missing
          * @description Verifies that the endpoint returns 400 Bad Request if either the required front or back field is missing from the request body.
          * @effects Sends two POST requests to /api/cards, one missing front, one missing back. Asserts status code is 400 for both and checks the error messages.
          */
         it('should return 400 if front or back is missing', async () => {
             // Act & Assert: Missing front
             const res1 = await request(app).post('/api/cards').send({ back: 'Only Back' });
             expect(res1.statusCode).toBe(400);
             expect(res1.body.error).toContain('Missing or invalid required field: front');

             // Act & Assert: Missing back
             const res2 = await request(app).post('/api/cards').send({ front: 'Only Front' });
             expect(res2.statusCode).toBe(400);
             expect(res2.body.error).toContain('Missing or invalid required field: back');
         });
    });

});


/**
 * @describe Deployment Assignment Endpoints
 * @description Groups tests specifically for the /api/create-answer and /api/get-latest-answer endpoints.
 */
describe('Deployment Assignment Endpoints', () => {
    /**
     * @function beforeEach (Deployment Assignment)
     * @description Resets the in-memory store for the latest answer before each test in this suite.
     * @effects Calls setLatestSubmittedData(null) from assignmentStore.
     */
    beforeEach(() => {
        setLatestSubmittedData(null);
        console.log('--- Assignment Test START (Latest Answer Reset) ---');
    });

    describe('POST /api/create-answer', () => {
        /**
         * @it should store the submitted data and return 201
         * @description Verifies successful data submission.
         */
        it('should store the submitted data and return 201', async () => {
            const testData = "This is a test string for deployment.";
            const response = await request(app)
                .post('/api/create-answer')
                .send({ data: testData });

            expect(response.statusCode).toBe(201);
            expect(response.body.message).toBe('Data created successfully.');
            expect(response.body.receivedData).toBe(testData);
            // Verify it's stored (indirectly, will be checked by GET endpoint test)
            expect(getLatestSubmittedData()).toBe(testData);
        });

        /**
         * @it should return 400 if data field is missing
         * @description Verifies error handling for missing 'data' field.
         */
        it('should return 400 if data field is missing', async () => {
            const response = await request(app)
                .post('/api/create-answer')
                .send({}); // Empty body

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid request: "data" field must be a non-empty string.');
        });

        /**
         * @it should return 400 if data field is not a string
         * @description Verifies error handling for incorrect 'data' field type.
         */
        it('should return 400 if data field is not a string', async () => {
            const response = await request(app)
                .post('/api/create-answer')
                .send({ data: 12345 }); // Data is a number

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid request: "data" field must be a non-empty string.');
        });

        /**
         * @it should return 400 if data field is an empty string
         * @description Verifies error handling for empty string 'data'.
         */
        it('should return 400 if data field is an empty string', async () => {
            const response = await request(app)
                .post('/api/create-answer')
                .send({ data: "   " }); // Data is whitespace

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid request: "data" field must be a non-empty string.');
        });
    });

    describe('GET /api/get-latest-answer', () => {
        /**
         * @it should return null if no data has been submitted
         * @description Verifies initial state retrieval.
         */
        it('should return null if no data has been submitted', async () => {
            const response = await request(app).get('/api/get-latest-answer');
            expect(response.statusCode).toBe(200);
            expect(response.body.latestData).toBeNull();
        });

        /**
         * @it should return the latest submitted data
         * @description Verifies retrieval of data after it has been posted.
         */
        it('should return the latest submitted data', async () => {
            const testData = "Latest submission for GET test.";
            // First, submit some data
            await request(app)
                .post('/api/create-answer')
                .send({ data: testData });

            // Then, retrieve it
            const response = await request(app).get('/api/get-latest-answer');
            expect(response.statusCode).toBe(200);
            expect(response.body.latestData).toBe(testData);
        });

        /**
         * @it should reflect the most recent submission if multiple POSTs are made
         * @description Verifies that only the last submitted data is returned.
         */
        it('should reflect the most recent submission if multiple POSTs are made', async () => {
            await request(app).post('/api/create-answer').send({ data: "First data" });
            
            const secondTestData = "Second (and latest) data";
            await request(app).post('/api/create-answer').send({ data: secondTestData });

            const response = await request(app).get('/api/get-latest-answer');
            expect(response.statusCode).toBe(200);
            expect(response.body.latestData).toBe(secondTestData);
        });
    });
});