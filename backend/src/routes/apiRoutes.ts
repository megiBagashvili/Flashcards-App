import express, { Request, Response, Router } from "express";

const router: Router = express.Router();

router.get("/practice", (req: Request, res: Response) => {
  console.log(`[API] GET /api/practice received`);
  res.status(200).json({
    message: "Placeholder: GET /api/practice",
    cards: [], //dummy
    day: 0, //dummy
  });
});

router.post("/update", (req: Request, res: Response) => {
  console.log(`[API] POST /api/update received with body:`, req.body);

  const { cardFront, cardBack, difficulty } = req.body;
  if (
    cardFront === undefined ||
    cardBack === undefined ||
    difficulty === undefined
  ) {
    console.warn("[API] POST /api/update - Missing required fields");
    return res
      .status(400)
      .json({
        error: "Missing required fields: cardFront, cardBack, difficulty",
      });
  }
  res.status(200).json({ message: "Placeholder: POST /api/update successful" });
});

router.get("/hint", (req: Request, res: Response) => {
  console.log(`[API] GET /api/hint received with query:`, req.query);

  const { cardFront, cardBack } = req.query;
  if (!cardFront || !cardBack) {
    console.warn("[API] GET /api/hint - Missing required query params");
    return res
      .status(400)
      .json({
        error: "Missing required query parameters: cardFront, cardBack",
      });
  }
  res
    .status(200)
    .json({
      message: "Placeholder for GET /api/hint",
      hint: `Hint for ${cardFront}`,
    });
});

router.get("/progress", (req: Request, res: Response) => {
  console.log(`[API] GET /api/progress received`);
  res.status(200).json({
    message: "Placeholder for GET /api/progress",
    accuracyRate: 0.5, // Dummy data
    bucketDistribution: { 0: 5, 1: 2 }, // Dummy data
    averageDifficulty: 1.5, // Dummy data
  });
});

router.post("/day/next", (req: Request, res: Response) => {
  console.log(`[API] POST /api/day/next received`);
  res
    .status(200)
    .json({ message: "Placeholder for POST /api/day/next", currentDay: 1 }); // Send dummy next day
});

router.post("/cards", (req: Request, res: Response) => {
  console.log(`[API] POST /api/cards received with body:`, req.body);
  const { front, back } = req.body;
  if (!front || !back) {
    console.warn("[API] POST /api/cards - Missing required fields");
    return res
      .status(400)
      .json({ error: "Missing required fields: front, back" });
  }

  res
    .status(201)
    .json({ message: "Placeholder: POST /api/cards (card created)" });
});

export default router;
