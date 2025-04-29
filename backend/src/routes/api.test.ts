import request from 'supertest';
import app from '../server';
import pool from '../db';   
import { Flashcard, AnswerDifficulty } from '../logic/flashcards';
import * as state from '../state';

beforeEach(async () => {
    try {
        await pool.query('DELETE FROM cards;');
    } catch (error) {
        console.error("Error clearing cards table in beforeEach:", error);
        throw error;
    }
});

afterAll(async () => {
    await pool.end(); 
    console.log("DB pool closed after all tests.");
});


// Test Suite 
describe('Flashcard API Endpoints', () => {

    describe('GET /api/practice', () => {
        it('should return status 200 and cards due today', async () => {
            await pool.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() - interval '1 hour')`,
                ['Test Practice Front', 'Test Practice Back']
            );
             await pool.query(
                `INSERT INTO cards (front, back, due_date) VALUES ($1, $2, NOW() + interval '1 day')`,
                ['Future Card', 'Future Back']
            );

            const response = await request(app).get('/api/practice');

            expect(response.statusCode).toBe(200);
            expect(response.body).toHaveProperty('cards');
            expect(response.body).toHaveProperty('day');
            expect(Array.isArray(response.body.cards)).toBe(true);

            const foundDueCard = response.body.cards.find((c: any) => c.front === 'Test Practice Front');
            expect(foundDueCard).toBeDefined();
            expect(foundDueCard?.back).toBe('Test Practice Back');

            const foundFutureCard = response.body.cards.find((c: any) => c.front === 'Future Card');
            expect(foundFutureCard).toBeUndefined();
        });

         it('should return an empty cards array if no cards are due', async () => {
             await pool.query(
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
            const insertRes = await pool.query(
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

            const verifyRes = await pool.query('SELECT due_date FROM cards WHERE id = $1', [cardId]);
            expect(verifyRes.rows.length).toBe(1);
            const newDueDate = new Date(verifyRes.rows[0].due_date);
            const timeDiff = newDueDate.getTime() - initialDueDate.getTime();

            const approx23HoursMillis = 23 * 60 * 60 * 1000;
            const approx25HoursMillis = 25 * 60 * 60 * 1000;

            expect(timeDiff).toBeGreaterThan(approx23HoursMillis); 
            expect(timeDiff).toBeLessThan(approx25HoursMillis + 1000);
        });

         it('should return 404 if card to update is not found', async () => {
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'NonExistent Front', cardBack: 'NonExistent Back', difficulty: AnswerDifficulty.Hard });
             expect(response.statusCode).toBe(404);
             expect(response.body.error).toBe('Card not found');
         });

         it('should return 400 if difficulty is missing', async () => {
             await pool.query(`INSERT INTO cards (front, back) VALUES ('Test', 'Test')`);
             const response = await request(app)
                 .post('/api/update')
                 .send({ cardFront: 'Test', cardBack: 'Test' });
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toContain('Missing or invalid required fields');
             expect(response.body.error).toContain('difficulty');
         });

         it('should return 400 if difficulty is invalid', async () => {
            await pool.query(`INSERT INTO cards (front, back) VALUES ('Test', 'Test')`);
            const response = await request(app)
                .post('/api/update')
                .send({ cardFront: 'Test', cardBack: 'Test', difficulty: 99 });
            expect(response.statusCode).toBe(400);
            expect(response.body.error).toContain('Invalid difficulty level');
        });
    });

    // Test for GET /api/hint
    describe('GET /api/hint', () => {
        it('should return 200 and the specific hint for an existing card', async () => {
            await pool.query(
                `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`,
                ['Hint Test Front', 'Hint Test Back', 'Specific Hint Here']
            );

            const responseWithHint = await request(app)
                .get('/api/hint?cardFront=Hint Test Front&cardBack=Hint Test Back');

            expect(responseWithHint.statusCode).toBe(200);
            expect(responseWithHint.body).toHaveProperty('hint');
            expect(responseWithHint.body.hint).toBe('Specific Hint Here');
        });

        it('should return 200 and a generated hint if card exists but hint is null/empty', async () => {
            await pool.query(
                `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`,
                ['Hint Test Default', 'Hint Test Default Back', null]
            );
             await pool.query(
                `INSERT INTO cards (front, back, hint) VALUES ($1, $2, $3)`,
                ['Hint Test Empty', 'Hint Test Empty Back', '']
            );

            const responseDefaultHint = await request(app)
                .get('/api/hint?cardFront=Hint Test Default&cardBack=Hint Test Default Back');

            expect(responseDefaultHint.statusCode).toBe(200);
            expect(responseDefaultHint.body).toHaveProperty('hint');
            expect(responseDefaultHint.body.hint).toMatch(/^Think about the key concepts related to Hint Test Default$/);

            const responseEmptyHint = await request(app)
                .get('/api/hint?cardFront=Hint Test Empty&cardBack=Hint Test Empty Back');

            expect(responseEmptyHint.statusCode).toBe(200);
            expect(responseEmptyHint.body).toHaveProperty('hint');
            expect(responseEmptyHint.body.hint).toMatch(/^Think about the key concepts related to Hint Test Empty$/);
        });


        it('should return 404 if card for hint is not found', async () => {
            const response = await request(app)
                .get('/api/hint?cardFront=NoExist&cardBack=NoExist');
            expect(response.statusCode).toBe(404);
            expect(response.body.error).toBe('Card not found');
        });

        it('should return 400 if query parameters are missing or invalid', async () => {
            const response1 = await request(app).get('/api/hint?cardFront=OnlyFront');
            expect(response1.statusCode).toBe(400);
            expect(response1.body.error).toContain('Missing or invalid required query parameters');

            const response2 = await request(app).get('/api/hint?cardBack=OnlyBack');
            expect(response2.statusCode).toBe(400);
            expect(response2.body.error).toContain('Missing or invalid required query parameters');

             const response3 = await request(app).get('/api/hint?cardFront=&cardBack=EmptyFront');
             expect(response3.statusCode).toBe(400);
             expect(response3.body.error).toContain('Missing or invalid required query parameters');
        });
    });

    // Test for GET /api/progress
    describe('GET /api/progress', () => {
        it('should return 200 and progress stats object with correct distribution', async () => {
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F1','B1', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F2','B2', 0)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F3','B3', 2)`);
             await pool.query(`INSERT INTO cards (front, back, "interval") VALUES ('F4','B4', 0)`);

             const response = await request(app).get('/api/progress');

             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('accuracyRate');
             expect(response.body).toHaveProperty('bucketDistribution');
             expect(response.body.averageDifficulty).toBeUndefined(); 

             expect(response.body.bucketDistribution['0']).toBe(3); 
             expect(response.body.bucketDistribution['2']).toBe(1); 
             expect(response.body.bucketDistribution['1']).toBeUndefined();
        });

         it('should return default stats if no cards exist', async () => {
             const response = await request(app).get('/api/progress');
             expect(response.statusCode).toBe(200);
             expect(response.body.accuracyRate).toBe(0);
             expect(response.body.bucketDistribution).toEqual({});
             expect(response.body.averageDifficulty).toBeUndefined();
         });
    });

     // Test for POST /api/day/next
     describe('POST /api/day/next', () => {
         let initialDayBeforeSuite: number;
         beforeAll(() => { initialDayBeforeSuite = state.getCurrentDay(); });

         it('should return 200 and the incremented day number', async () => {
             const initialDay = state.getCurrentDay();
             const response = await request(app).post('/api/day/next');

             expect(response.statusCode).toBe(200);
             expect(response.body).toHaveProperty('currentDay');
             const expectedDay = initialDay + 1;
             expect(response.body.currentDay).toBe(expectedDay);
             expect(state.getCurrentDay()).toBe(expectedDay);
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
             expect(response.body).toHaveProperty('created_at');
             expect(response.body).toHaveProperty('updated_at');

             const verifyRes = await pool.query('SELECT * FROM cards WHERE id = $1', [response.body.id]);
             expect(verifyRes.rows.length).toBe(1);
             expect(verifyRes.rows[0].front).toBe(newCardData.front);
         });

         it('should return 400 if front is missing', async () => {
             const response = await request(app)
                 .post('/api/cards')
                 .send({ back: 'Only Back', hint: 'h', tags: [] });
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toBe('Missing or invalid required field: front (string)');
         });

          it('should return 400 if back is missing', async () => {
             const response = await request(app)
                 .post('/api/cards')
                 .send({ front: 'Only Front', hint: 'h', tags: [] });
             expect(response.statusCode).toBe(400);
             expect(response.body.error).toBe('Missing or invalid required field: back (string)');
         });

          it('should accept null/empty hint and tags', async () => {
             const cardDataNoHint = { front: 'No Hint Front', back: 'No Hint Back', tags: ['tag1'] };
             const responseNoHint = await request(app).post('/api/cards').send(cardDataNoHint);
             expect(responseNoHint.statusCode).toBe(201);
             expect(responseNoHint.body.hint).toBeNull();

             const cardDataNoTags = { front: 'No Tags Front', back: 'No Tags Back', hint: 'Has hint' };
             const responseNoTags = await request(app).post('/api/cards').send(cardDataNoTags);
             expect(responseNoTags.statusCode).toBe(201);
             expect(responseNoTags.body.tags).toBeNull();

              const cardDataEmptyTags = { front: 'Empty Tags Front', back: 'Empty Tags Back', hint: 'Has hint', tags: [] };
              const responseEmptyTags = await request(app).post('/api/cards').send(cardDataEmptyTags);
              expect(responseEmptyTags.statusCode).toBe(201);
              expect(responseEmptyTags.body.tags).toBeNull(); 
          });
    });

});