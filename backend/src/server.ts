import express, { Request, Response } from "express";
import cors from "cors";
import * as logic from "./logic/algorithm";
import { Flashcard, AnswerDifficulty } from "../src/logic/flashcards";
import * as state from "./state";
import { UpdateRequest, ProgressStats, PracticeRecord } from "./types";

const app = express();
const PORT = process.env.PORT || 3001;
 
app.use(cors());
app.use(express.json());

app.get("/api/practice", (req: Request, res: Response) => {
  try {
    const day = state.getCurrentDay();
    const bucketsMap = state.getBuckets();
    const bucketSets = logic.toBucketSets(bucketsMap);
    const cardsToPracticeSet = logic.practice(bucketSets, day);
    const cardsToPracticeArray = Array.from(cardsToPracticeSet);

    console.log(`Day ${day}: Practice ${cardsToPracticeArray.length} cards`);
    res.json({ cards: cardsToPracticeArray, day });
  } catch (error) {
    console.error("Error getting practice cards:", error);
    res.status(500).json({ message: "Error fetching practice cards" });
  }
});

app.post("/api/update", (req: Request, res: Response) => {
  try {
    const { cardFront, cardBack, difficulty } = req.body as UpdateRequest;

    if (!(difficulty in AnswerDifficulty)) {
      res.status(400).json({ message: "Invalid difficulty level" });
      return;
    }

    const card = state.findCard(cardFront, cardBack);
    if (!card) {
      res.status(404).json({ message: "Card not found" });
      return;
    }

    const currentBuckets = state.getBuckets();
    const previousBucket = state.findCardBucket(card);

    const updatedBuckets = logic.update(currentBuckets, card, difficulty);
    state.setBuckets(updatedBuckets);

    const newBucket = state.findCardBucket(card);
    const historyRecord: PracticeRecord = {
      cardFront: card.front,
      cardBack: card.back,
      timestamp: Date.now(),
      difficulty,
      previousBucket: previousBucket ?? -1,
      newBucket: newBucket ?? -1,
    };
    state.addHistoryRecord(historyRecord);

    console.log(
      `Updated card "${card.front}": Difficulty ${AnswerDifficulty[difficulty]}, New Bucket ${newBucket}`
    );
    res.status(200).json({ message: "Card updated successfully" });
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({ message: "Error updating card" });
  }
});

app.get("/api/hint", (req: Request, res: Response) => {
  try {
    const { cardFront, cardBack } = req.query;

    if (typeof cardFront !== "string" || typeof cardBack !== "string") {
      res
        .status(400)
        .json({ message: "Missing cardFront or cardBack query parameter" });
      return;
    }

    const card = state.findCard(cardFront, cardBack);
    if (!card) {
      res.status(404).json({ message: "Card not found" });
      return;
    }

    const hint = logic.getHint(card);
    console.log(`Hint requested for "${card.front}": ${hint}`);
    res.json({ hint });
  } catch (error) {
    console.error("Error getting hint:", error);
    res.status(500).json({ message: "Error getting hint" });
  }
});

app.get("/api/progress", (req, res) => {
  try {
    const buckets = state.getBuckets();
    const rawHistory = state.getHistory();

    const formattedHistory = rawHistory.map(r => {
      const card = state.findCard(r.cardFront, r.cardBack);
      if (!card) {
        throw new Error(`Unknown card in history: ${r.cardFront}`);
      }
      return {
        card,
        difficulty: r.difficulty,
        timestamp: r.timestamp,
      };
    });

    const progress = logic.computeProgress(buckets, formattedHistory);
    res.json(progress);

  } catch (error) {
    console.error("Error computing progress:", error);
    res.status(500).json({ message: "Error computing progress" });
  }
});


app.post("/api/day/next", (req: Request, res: Response) => {
  state.incrementDay();
  const newDay = state.getCurrentDay();
  console.log(`Advanced to Day ${newDay}`);
  res
    .status(200)
    .json({ message: `Advanced to day ${newDay}`, currentDay: newDay });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Current Day: ${state.getCurrentDay()}`);
});