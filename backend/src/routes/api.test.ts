import request from 'supertest';
import app from '../server';
import pool from '../db';
import pg from 'pg';
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import * as state from '../state';

beforeAll(async () => {
    try {
        await pool.query('SELECT 1');
        console.log("Test DB Pool seems connected");
    } catch (error) {
        console.error("Failed initial pool query check", error);
    }
});

afterAll(async () => {
    await pool.end();
    console.log("DB pool closed");
});

beforeEach(async () => {
    try {
        await pool.query('DELETE FROM cards');
        console.log('--- Test START (DELETE FROM cards completed) ---');
    } catch (error) {
        console.error("Failed to DELETE FROM cards in beforeEach", error);
        throw error;
    }
});

afterEach(async () => {
     console.log('--- Test END ---');
});


describe('Flashcard API Endpoints', () => {

    describe('GET /api/practice', () => {
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

         it('should return an empty cards array if no cards are due', async () => {
             await pool.query(`INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '7 days')`, ['Future Card Only', 'Future Back Only']);
             const response = await request(app).get('/api/practice');
             expect(response.statusCode).toBe(200);
             expect(response.body.cards).toHaveLength(0);
         });
    });

    describe('POST /api/update', () => {
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

        it('should return 404 if card to update is not found', async () => {
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'NonExistent', cardBack: 'NonExistent', difficulty: AnswerDifficulty.Hard });
             expect(response.statusCode).toBe(404);
        });

        it('should return 400 if difficulty is missing', async () => {
             await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid')`);
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'Update Invalid', cardBack: 'Update Back Invalid' });
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 if difficulty is invalid', async () => {
            await pool.query(`INSERT INTO cards (front, back) VALUES ('Update Invalid','Update Back Invalid')`);
            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Update Invalid', cardBack: 'Update Back Invalid', difficulty: 99 });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid difficulty level');
        });
    });

    describe('GET /api/hint', () => {
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

        it('should return 404 if card for hint is not found', async () => {
            const response = await request(app).get('/api/hint?cardFront=NoExist&cardBack=NoExist');
            expect(response.statusCode).toBe(404);
        });

        it('should return 400 if query parameters are missing', async () => {
            const response = await request(app).get('/api/hint?cardFront=OnlyFront');
            expect(response.statusCode).toBe(400);
        });
    });

    describe('GET /api/progress', () => {
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
        
        it('should return default stats if no cards exist', async () => {
             const response = await request(app).get('/api/progress');
             expect(response.statusCode).toBe(200);
             expect(response.body.bucketDistribution).toEqual({});
             expect(response.body.accuracyRate).toBe(0);
             expect(response.body.averageDifficulty).toBeUndefined();
        });
    });

     describe('POST /api/day/next', () => {
         let initialDayBeforeTest: number;

         beforeEach(() => {
             initialDayBeforeTest = state.getCurrentDay(); 
         });

         afterEach(() => {
         });

         it('should return 200 and the incremented day number', async () => {
             const initialDay = state.getCurrentDay();
             const response = await request(app).post('/api/day/next');
             expect(response.statusCode).toBe(200);
             expect(response.body.currentDay).toBe(initialDay + 1);
             expect(state.getCurrentDay()).toBe(initialDay + 1); 
         });
     });


    describe('POST /api/cards', () => {
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

         it('should return 201 when hint and tags are provided', async () => {
             const newCardData = { front: 'Create Front 2', back: 'Create Back 2', hint: "A Hint", tags: ["tag1", "tag2"] };
             const response = await request(app).post('/api/cards').send(newCardData);
             
             expect(response.statusCode).toBe(201);
             expect(response.body.hint).toBe(newCardData.hint);
             expect(response.body.tags).toEqual(newCardData.tags);
         });

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
