import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

// The Pool constructor automatically reads the standard PG* environment variables
// (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD) if they are set in process.env.
// dotenv.config() ensures they are loaded from .env file into process.env.
const pool = new Pool({
  // Example: connectionString: process.env.DATABASE_URL
  // Example: max: 20,
  // Example: idleTimeoutMillis: 30000,
  // Example: connectionTimeoutMillis: 2000,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle database client", err);
  // process.exit(-1);
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.stack);
  } else {
    console.log(`✅ Database connected successfully at ${res.rows[0].now}`);
  }
});

export default pool;
