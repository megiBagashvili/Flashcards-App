import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// xreate a new connection pool instance.
// automatically reads environment variables PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
// loaded by dotenv.config() from the .env file.
const pool = new Pool({
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle database client:', err);
});

pool.query('SELECT NOW()')
    .then(res => {
        console.log(`✅ Database connected successfully at ${res?.rows?.[0]?.now}`);
    })
    .catch(err => {
        console.error('❌ Database connection query failed:', err.stack || err);
    });

export default pool;

