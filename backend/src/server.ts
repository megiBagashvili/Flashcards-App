import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/apiRoutes';
import pool from './db';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.url}`);
    next();
});

//Root path for health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Flashcards API server is running!' });
});

//Direct all requests starting with /api to the apiRouter
app.use('/api', apiRouter);


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

    //ensd a good error response to client
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred on the server. Please try again later.'
     });
});

if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`⚡️[server]: Server is running and listening on http://localhost:${PORT}`);
    });
}
export default app;
