import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Load questions
const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, "questions.json"))).questions;

// Store session scores
let scores = {};

// GET random question
app.get("/question/random", (req, res) => {
  const sessionId = req.query.session || "default";
  scores[sessionId] ??= { askedIds: [], totalScore: 0 };

  const remaining = questionsData.filter(q => !scores[sessionId].askedIds.includes(q.id));
  if (!remaining.length) return res.json({ message: "All questions answered!" });

  const question = remaining[Math.floor(Math.random() * remaining.length)];
  res.json({
    id: question.id,
    category: question.category,
    question: question.question,
    options: question.options
  });
});

// POST answer
app.post("/answer", (req, res) => {
  const { session, questionId, answer } = req.body;
  if (!session || !questionId || !answer) return res.status(400).json({ error: "Missing parameters" });

  const quiz = questionsData.find(q => q.id === questionId);
  if (!quiz) return res.status(404).json({ error: "Question not found" });

  scores[session] ??= { askedIds: [], totalScore: 0 };
  if (!scores[session].askedIds.includes(questionId)) scores[session].askedIds.push(questionId);

  const correct = answer.toUpperCase() === quiz.answer.toUpperCase();
  if (correct) scores[session].totalScore += 5;

  res.json({
    correct,
    correctAnswer: quiz.answer,
    score: scores[session].totalScore,
    questionsAnswered: scores[session].askedIds.length
  });
});

// GET total score
app.get("/score", (req, res) => {
  const sessionId = req.query.session || "default";
  const sessionData = scores[sessionId];
  if (!sessionData) return res.json({ message: "No score yet" });

  res.json({
    totalScore: sessionData.totalScore,
    questionsAnswered: sessionData.askedIds.length,
    maxPossibleScore: sessionData.askedIds.length * 5
  });
});

app.listen(5000, () => console.log("Quiz server running on port 5000"));
