import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// Safe load questions data
const questionsFilePath = path.join(__dirname, "questions.json");
let questionsData = [];

function loadQuestions() {
  try {
    const raw = fs.readFileSync(questionsFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    questionsData = parsed.questions || [];
    console.log(`Loaded ${questionsData.length} questions across multiple categories.`);
  } catch (err) {
    console.error("Error reading questions.json:", err.message);
    questionsData = [];
  }
}
loadQuestions();

// Session storage with auto-cleanup
// Structure: { [sessionId]: { askedIds: [], score: 0, streak: 0, maxStreak: 0, answers: [], lastActive: number } }
const sessions = new Map();

// In-memory Leaderboard with default starter scores
const leaderboard = [
  { name: "Alex Quantum", score: 140, category: "All", accuracy: 95, date: "2026-08-20" },
  { name: "Sophia Spark", score: 125, category: "Science & Nature", accuracy: 90, date: "2026-08-19" },
  { name: "David Code", score: 115, category: "Technology & Computing", accuracy: 88, date: "2026-08-18" },
  { name: "Maya Word", score: 95, category: "English", accuracy: 85, date: "2026-08-17" }
];

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      askedIds: [],
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      history: [],
      lastActive: Date.now()
    });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

// Clean old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours
  for (const [id, data] of sessions.entries()) {
    if (now - data.lastActive > maxAge) {
      sessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

// Helper: category metadata
const CATEGORY_META = {
  "Mathematics": { icon: "🧮", color: "#6366F1", description: "Arithmetic, Algebra, Geometry & Logic" },
  "English": { icon: "📖", color: "#EC4899", description: "Grammar, Vocabulary, Spelling & Idioms" },
  "Science & Nature": { icon: "🔬", color: "#10B981", description: "Physics, Biology, Chemistry & Cosmos" },
  "Technology & Computing": { icon: "💻", color: "#3B82F6", description: "Programming, AI, Hardware & Web" },
  "World History & Geography": { icon: "🌍", color: "#F59E0B", description: "Civilizations, Wonders & Geography" },
  "Current Affairs & GK": { icon: "⚡", color: "#8B5CF6", description: "Global Facts, Culture & Sports" }
};

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// GET /api/categories - list all categories with statistics
app.get("/api/categories", (req, res) => {
  const counts = {};
  questionsData.forEach(q => {
    counts[q.category] = (counts[q.category] || 0) + 1;
  });

  const categories = Object.keys(counts).map(cat => ({
    name: cat,
    count: counts[cat],
    icon: CATEGORY_META[cat]?.icon || "🎯",
    color: CATEGORY_META[cat]?.color || "#6366F1",
    description: CATEGORY_META[cat]?.description || "Explore and master quiz questions"
  }));

  res.json({
    totalQuestions: questionsData.length,
    categories
  });
});

// GET /api/quiz - get a customized, randomized batch of questions
app.get("/api/quiz", (req, res) => {
  const { session = "default", category, difficulty, count = 10 } = req.query;
  const requestedCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 50);

  let pool = [...questionsData];

  if (category && category !== "All" && category !== "all") {
    pool = pool.filter(q => q.category.toLowerCase() === category.toLowerCase());
  }

  if (difficulty && difficulty !== "all") {
    pool = pool.filter(q => q.difficulty === difficulty);
  }

  if (pool.length === 0) {
    return res.status(404).json({ error: "No questions match the selected filters." });
  }

  // Shuffle pool (Fisher-Yates)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, requestedCount).map(q => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty || "medium",
    question: q.question,
    options: q.options
  }));

  // Reset session for fresh quiz
  sessions.set(session, {
    askedIds: [],
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    history: [],
    lastActive: Date.now()
  });

  res.json({
    sessionId: session,
    total: selected.length,
    questions: selected
  });
});

// GET /api/question/random (and legacy /question/random)
function handleRandomQuestion(req, res) {
  const sessionId = req.query.session || "default";
  const category = req.query.category;
  const session = getSession(sessionId);

  let pool = questionsData;
  if (category && category !== "All" && category !== "all") {
    pool = pool.filter(q => q.category.toLowerCase() === category.toLowerCase());
  }

  const remaining = pool.filter(q => !session.askedIds.includes(q.id));
  if (!remaining.length) {
    return res.json({ message: "All questions answered!", remaining: 0 });
  }

  const question = remaining[Math.floor(Math.random() * remaining.length)];
  res.json({
    id: question.id,
    category: question.category,
    difficulty: question.difficulty || "medium",
    question: question.question,
    options: question.options
  });
}
app.get("/api/question/random", handleRandomQuestion);
app.get("/question/random", handleRandomQuestion);

// POST /api/answer (and legacy /answer)
function handleAnswer(req, res) {
  const { session = "default", questionId, answer, timeBonus = 0 } = req.body;
  if (!questionId || !answer) {
    return res.status(400).json({ error: "Missing required parameters (questionId, answer)" });
  }

  const qId = parseInt(questionId, 10);
  const quiz = questionsData.find(q => q.id === qId);
  if (!quiz) {
    return res.status(404).json({ error: "Question not found" });
  }

  const sessionData = getSession(session);

  if (!sessionData.askedIds.includes(qId)) {
    sessionData.askedIds.push(qId);
  }

  // Parse answer key (e.g., "B" or "B. 12" -> "B")
  const cleanedAnswer = answer.trim().charAt(0).toUpperCase();
  const correctAnswerKey = quiz.answer.trim().charAt(0).toUpperCase();
  const isCorrect = cleanedAnswer === correctAnswerKey;

  let pointsEarned = 0;
  let streakBonus = 0;

  if (isCorrect) {
    sessionData.correctCount += 1;
    sessionData.streak += 1;
    if (sessionData.streak > sessionData.maxStreak) {
      sessionData.maxStreak = sessionData.streak;
    }

    // Base score = 10 points per correct answer
    const basePoints = 10;
    // Streak bonus: +2 extra points for each streak point above 1
    if (sessionData.streak > 1) {
      streakBonus = Math.min((sessionData.streak - 1) * 2, 10);
    }
    // Time speed bonus (if answered quickly, up to 5 points)
    const speedPoints = Math.min(Math.max(parseInt(timeBonus, 10) || 0, 0), 5);

    pointsEarned = basePoints + streakBonus + speedPoints;
    sessionData.score += pointsEarned;
  } else {
    sessionData.streak = 0;
  }

  // Record history
  sessionData.history.push({
    questionId: qId,
    questionText: quiz.question,
    category: quiz.category,
    userAnswer: cleanedAnswer,
    correctAnswer: correctAnswerKey,
    correct: isCorrect,
    explanation: quiz.explanation || "",
    pointsEarned
  });

  res.json({
    correct: isCorrect,
    correctAnswer: correctAnswerKey,
    explanation: quiz.explanation || "No explanation available.",
    pointsEarned,
    streak: sessionData.streak,
    maxStreak: sessionData.maxStreak,
    score: sessionData.score,
    questionsAnswered: sessionData.askedIds.length
  });
}
app.post("/api/answer", handleAnswer);
app.post("/answer", handleAnswer);

// GET /api/session/state (and legacy /score)
function handleSessionScore(req, res) {
  const sessionId = req.query.session || "default";
  const sessionData = sessions.get(sessionId);

  if (!sessionData) {
    return res.json({ message: "No session found", totalScore: 0, questionsAnswered: 0 });
  }

  const accuracy = sessionData.askedIds.length > 0
    ? Math.round((sessionData.correctCount / sessionData.askedIds.length) * 100)
    : 0;

  res.json({
    totalScore: sessionData.score,
    correctCount: sessionData.correctCount,
    questionsAnswered: sessionData.askedIds.length,
    streak: sessionData.streak,
    maxStreak: sessionData.maxStreak,
    accuracy,
    history: sessionData.history
  });
}
app.get("/api/session/state", handleSessionScore);
app.get("/score", handleSessionScore);

// POST /api/session/reset
app.post("/api/session/reset", (req, res) => {
  const { session = "default" } = req.body;
  sessions.delete(session);
  res.json({ message: "Session reset successfully" });
});

// GET /api/leaderboard
app.get("/api/leaderboard", (req, res) => {
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  res.json({ leaderboard: sorted });
});

// POST /api/leaderboard - submit high score
app.post("/api/leaderboard", (req, res) => {
  const { name, score, category = "All", accuracy = 100 } = req.body;
  if (!name || score === undefined) {
    return res.status(400).json({ error: "Name and score are required" });
  }

  const entry = {
    name: name.trim().slice(0, 20),
    score: parseInt(score, 10) || 0,
    category,
    accuracy: Math.min(Math.max(parseInt(accuracy, 10) || 0, 0), 100),
    date: new Date().toISOString().split("T")[0]
  };

  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);

  res.json({ message: "Score submitted!", rank: leaderboard.indexOf(entry) + 1 });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Quiz server running at http://localhost:${PORT}`);
});
