import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/apiRoutes'; 

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001; 


app.use(cors());

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.url}`);
    next();
});


app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Flashcards API server is running!' });
});


app.use('/api', apiRouter); 



app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error occurred:", err.stack || err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});



app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running and listening on http://localhost:${PORT}`);
});

// export default app; // Keep commented unless needed for testing setup
