/**
 * @file backend/src/db.ts
 * @description Initializes and exports the PostgreSQL connection pool for the application.
 * Uses the 'pg' library and relies on environment variables for configuration,
 * loaded via 'dotenv'. Includes basic error handling for idle clients and
 * an initial connection test query.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * @const {pg.Pool} pool
 * @description An instance of the PostgreSQL connection pool.
 * The Pool constructor automatically reads connection parameters
 * (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD) from the environment
 * variables, which should have been loaded by dotenv.config().
 * It manages a pool of client connections to the database.
 */
const pool = new Pool({
});

/**
 * @event error
 * @description Event listener attached to the pool to catch errors that occur on
 * idle client connections within the pool. This helps prevent unhandled errors
 * from crashing the application.
 * @param {Error} err - The error object emitted by the idle client.
 * @param {pg.Client} client - The client instance that experienced the error.
 * @effects Logs the unexpected error to the console.
 */
pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle database client:', err);
});

/**
 * @description Initial Database Connection Test.
 * Attempts to execute a simple query ('SELECT NOW()') immediately after pool
 * initialization to verify that a connection can be established successfully.
 * Logs the outcome (success or failure) to the console.
 * This is an asynchronous operation that runs independently.
 * @effects Executes a query against the database using the pool. Logs connection status.
 */
pool.query('SELECT NOW()')
    .then(res => {
        console.log(`✅ Database connected successfully at ${res?.rows?.[0]?.now}`);
    })
    .catch(err => {
        console.error('❌ Database connection query failed:', err.stack || err);
    });

/**
 * @exports pool
 * @description Exports the configured PostgreSQL connection pool instance
 * so it can be imported and used by other modules in the backend application
 * (for exxample, API route handlers) to execute database queries.
 */    
export default pool;