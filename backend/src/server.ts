/**
 * @file backend/src/server.ts
 * @description Main entry point for the Express backend server.
 * Sets up middleware (CORS, JSON parsing, request logging), defines routes,
 * implements basic error handling, and starts the server listener conditionally.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/apiRoutes';
import pool from './db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;


/**
 * @middleware cors
 * @description Enables Cross-Origin Resource Sharing for all origins by default.
 * Allows requests from the frontend to reach the API.
 */
app.use(cors());

/**
 * @middleware express.json
 * @description Parses incoming requests with JSON payloads.
 * Populates req.body with the parsed JSON object.
 */
app.use(express.json());

/**
 * @middleware Request Logger
 * @description A simple custom middleware to log basic information about each incoming request.
 * Logs the timestamp, HTTP method, and requested URL.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The callback function to pass control to the next middleware.
 * @effects Logs request details to the console. Calls next() to continue processing.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.url}`);
    next();
});

/**
 * @route GET /
 * @description Root path route handler for basic health checks.
 * Responds with a simple JSON message indicating the server is running.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @effects Sends a 200 OK response with a JSON body.
 * @modifies res object.
 */
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Flashcards API server is running!' });
});

/**
 * @middleware API Router
 * @description Mounts the apiRouter
 * to handle all requests prefixed with /api.
 * @param {string} path - The path prefix
 * @param {Router} router - The router instance
 */
app.use('/api', apiRouter);


/**
 * @middleware Error Handling Middleware
 * @description A centralized error handler that catches errors passed via next(err)
 * or thrown synch/asynchronously in route handlers.
 * Logs detailed error information to the console and sends a generic 500 Internal Server Error
 * response to the client to avoid leaking sensitive details.
 * @param {Error} err - The error object caught.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The callback function to pass control to further error handlers
 * @effects Logs detailed error information. Sends a 500 status response with a generic JSON error message if headers haven't already been sent. Otherwise, delegates to the default Express error handler.
 * @modifies res object
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("--- UNHANDLED ERROR ---");
    console.error("Timestamp:", new Date().toISOString());
    console.error("Route:", `${req.method} ${req.originalUrl}`);
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack || "No stack available");
    console.error("--- END UNHANDLED ERROR ---");

    //check if headers have already been sent to the client
    if (res.headersSent) {
      //If ki, delegate to the default Express error handler
      return next(err);
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred on the server. Please try again later.'
     });
});


/**
 * @description Conditional Server Start.
 * Checks if this script is the main module being run directly.
 * If it is, it starts the Express server and makes it listen for incoming connections on the specified PORT.
 * This prevents the server from automatically starting when the app instance is imported
 * by other modules
 */
if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`⚡️[server]: Server is running and listening on http://localhost:${PORT}`);
    });
}

/**
 * @exports app
 * @description Exports the configured Express application instance.
 * This allows other modules, particularly test files,
 * to import and interact with the application without starting the listener.
 */
export default app;
