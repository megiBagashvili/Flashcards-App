import request from 'supertest';
import app from '../server';      
import pool from '../db';         
import pg from 'pg';            
import { Flashcard, AnswerDifficulty } from '../logic/flashcards'; 
import * as state from '../state';

let client: pg.PoolClient;

beforeAll(async () => {
    try {
        client = await pool.connect();
        console.log("Test DB client connected");
    } catch (error) {
        console.error("Failed to connect test client to database", error);
        throw new Error("Database connection for tests failed");
    }
});

afterAll(async () => {
    if (client) {
        client.release(); 
        console.log("Test DB client released");
    }
    await pool.end();
    console.log("DB pool closed");
});

beforeEach(async () => {
    if (client) {
        await client.query('BEGIN'); 
    } else {
        throw new Error("Test client not available for BEGIN");
    }
});

afterEach(async () => {
    if (client) {
        await client.query('ROLLBACK'); 
    } else {
        console.error("Test client not available for ROLLBACK");
    }
});



describe('Flashcard API Endpoints', () => {

    // Test for GET /api/practice
    describe('GET /api/practice', () => {
        it('should return status 200 and an object with cards array and day number', async () => {
            await client.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour')`, 
                ['Test Practice Front', 'Test Practice Back']
            );

            const response = await request(app).get('/api/practice');

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('cards');
            expect(response.body).toHaveProperty('day');
            expect(Array.isArray(response.body.cards)).toBe(true);
            const foundCard = response.body.cards.find((c: Flashcard) => c.front === 'Test Practice Front');
            expect(foundCard).toBeDefined();
            expect(foundCard.back).toBe('Test Practice Back');
        });

         it('should return an empty cards array if no cards are due', async () => {
             await client.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '1 day')`,
                ['Future Card', 'Future Back']
            );
             const response = await request(app).get('/api/practice');
             expect(response.statusCode).toBe(200);
             expect(response.body.cards).toHaveLength(0);
         });
    });

    // Test for POST /api/update
    describe('POST /api/update', () => {
        it('should return status 200 and update due_date for existing card (Easy)', async () => {
            const insertRes = await client.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour') RETURNING id, due_date`,
                ['Update Test Easy', 'Update Back Easy']
            );
            const cardId = insertRes.rows[0].id;
            const initialDueDate = new Date(insertRes.rows[0].due_date); 

            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Update Test Easy', cardBack: 'Update Back Easy', difficulty: AnswerDifficulty.Easy }); 

            expect(response.statusCode).toBe(200);
            expect(response.body.message).toContain('updated successfully');

            const verifyRes = await client.query('SELECT due_date FROM cards WHERE id = $1', [cardId]);
            expect(verifyRes.rows.length).toBe(1);
            const newDueDate = new Date(verifyRes.rows[0].due_date); 
            const timeDiff = newDueDate.getTime() - initialDueDate.getTime();
            const oneDayMillis = 24 * 60 * 60 * 1000;
            expect(timeDiff).toBeGreaterThan(oneDayMillis - 5000);
            expect(timeDiff).toBeLessThan(oneDayMillis + 5000);
        });

         it('should return 404 if card to update is not found', async () => {
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'NonExistent Front', cardBack: 'NonExistent Back', difficulty: AnswerDifficulty.Hard });
             expect(response.statusCode).toBe(404);
             expect(response.body.error).toBe('Card not found');
         });

         it('should return 400 if difficulty is missing', async () => {
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'Test', cardBack: 'Test' }); 
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields');
         });

         it('should return 400 if difficulty is invalid', async () => {
            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Test', cardBack: 'Test', difficulty: 99 }); 
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid difficulty level');
        });
    });

    // Test for GET /api/hint
    describe('GET /api/hint', () => {
        it('should return 200 and a hint for an existing card', async () => {
            await client.query(
                `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`,
                ['Hint Test Front', 'Hint Test Back', 'Specific Hint Here']
            );
             await client.query(
                `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`,
                ['Hint Test Default', 'Hint Test Default Back', null]
            );

            const responseWithHint = await request(app)
                .get('/api/hint?cardFront=Hint Test Front&cardBack=Hint Test Back');

            expect(responseWithHint.statusCode).toBe(200);
            expect(responseWithHint.body).toHaveProperty('hint');
            expect(responseWithHint.body.hint).toBe('Specific Hint Here');

            const responseDefaultHint = await request(app)
                .get('/api/hint?cardFront=Hint Test Default&cardBack=Hint Test Default Back');

            expect(responseDefaultHint.statusCode).toBe(200);
            expect(responseDefaultHint.body).toHaveProperty('hint');
            expect(responseDefaultHint.body.hint).toContain('Think about the key concepts related to');
            expect(responseDefaultHint.body.hint).toContain('Hint Test Default');
        });

        it('should return 404 if card for hint is not found', async () => {
            const response = await request(app)
                .get('/api/hint?cardFront=NoExist&cardBack=NoExist');
            expect(response.statusCode).toBe(404);
            expect(response.body.error).toBe('Card not found');
        });

        it('should return 400 if query parameters are missing', async () => {
            const response = await request(app).get('/api/hint?cardFront=OnlyFront');
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Missing required query parameters');
        });
    });

    // Test for GET /api/progress
    describe('GET /api/progress', () => {
        it('should return 200 and progress stats object', async () => {
             await client.query(`INSERT INTO cards (front, back, "interval") VALUES ('F1','B1', 0)`);
             await client.query(`INSERT INTO cards (front, back, "interval") VALUES ('F2','B2', 0)`);
             await client.query(`INSERT INTO cards (front, back, "interval") VALUES ('F3','B3', 2)`);

             const response = await request(app).get('/api/progress');

             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('accuracyRate'); 
             expect(response.body).toHaveProperty('bucketDistribution');
             expect(response.body).toHaveProperty('averageDifficulty'); 
             expect(response.body.bucketDistribution['0']).toBe(2);
             expect(response.body.bucketDistribution['2']).toBe(1);
             expect(response.body.bucketDistribution['1']).toBeUndefined(); 
        });
    });

     // Test for POST /api/day/next
     describe('POST /api/day/next', () => {
         it('should return 200 and the incremented day number', async () => {
             const initialDay = state.getCurrentDay(); 
             const response = await request(app).post('/api/day/next');

             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('currentDay');
             expect(response.body.currentDay).toBe(initialDay + 1);
             expect(state.getCurrentDay()).toBe(initialDay + 1);
         });
     });


    // Test for POST /api/cards (Card Creation)
    describe('POST /api/cards', () => {
         it('should return 201 and the created card data', async () => {
             const newCardData = {
                 front: 'Create Test Front',
                 back: 'Create Test Back',
                 hint: 'Create Hint',
                 tags: ['create', 'test']
             };
             const response = await request(app)
                 .post('/api/cards')
                 .send(newCardData);

             expect(response.statusCode).toBe(201);
             expect(response.body).toHaveProperty('id');
             expect(response.body.front).toBe(newCardData.front);
             expect(response.body.back).toBe(newCardData.back);
             expect(response.body.hint).toBe(newCardData.hint);
             expect(response.body.tags).toEqual(newCardData.tags);
             expect(response.body).toHaveProperty('due_date');

             const verifyRes = await client.query('SELECT * FROM cards WHERE id = $1', [response.body.id]);
             expect(verifyRes.rows.length).toBe(1);
             expect(verifyRes.rows[0].front).toBe(newCardData.front);
         });

         it('should return 400 if front or back is missing', async () => {
             const response = await request(app)
                 .post('/api/cards')
                 .send({ back: 'Only Back' }); 
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields');
         });
    });

});