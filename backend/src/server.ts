import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app: Express = express();

const PORT = process.env.PORT || 3001;

// --- Middleware Setup ---

// Enable Cross-Origin Resource Sharing (CORS) for all origins.
// This allows requests from your extension and potentially your frontend.
// For production, you might want to configure specific allowed origins.
app.use(cors());

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.url}`);
    next(); // Pass control to the next middleware or route handler
});

// --- Basic Routes ---

// Define a simple GET route for the root path ('/')
// This helps verify that the server is running and responding.
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Flashcards API server is running!' });
});




// --- Basic Error Handling Middleware ---
// This should be placed *after* all your routes.
// It catches any errors that occur during request handling.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error occurred:", err.stack || err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});


// --- Start the Server ---

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running and listening on http://localhost:${PORT}`);
});

// Optional: Export the app for potential use in integration tests later
// export default app;
