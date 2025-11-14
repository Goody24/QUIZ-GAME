let score = 0;
let currentIndex = 0;
let questions = [];
const session = "session_" + Date.now();

const introDiv = document.getElementById("intro");
const startBtn = document.getElementById("startBtn");

const quizDiv = document.getElementById("quiz");
const categoryEl = document.getElementById("category");
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const scoreEl = document.getElementById("score");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const quitBtn = document.getElementById("quitBtn");

const resultDiv = document.getElementById("result");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// Start Quiz
startBtn.onclick = async () => {
  introDiv.classList.add("hidden");
  quizDiv.classList.remove("hidden");
  await loadQuestions();
  showQuestion(currentIndex);
};

// Load all questions from server
async function loadQuestions() {
  const res = await fetch(`/question/random?session=${session}`);
  const data = await res.json();
  questions.push(data);

  // Load remaining questions
  while (questions.length < 20) {
    const res2 = await fetch(`/question/random?session=${session}`);
    const nextQ = await res2.json();
    if (!nextQ.message) questions.push(nextQ);
    else break;
  }
}

// Show question by index
function showQuestion(index) {
  const q = questions[index];
  currentIndex = index;
  categoryEl.textContent = `Category: ${q.category}`;
  questionEl.textContent = q.question;
  optionsEl.innerHTML = "";
  feedbackEl.textContent = "";
  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(opt[0], btn);
    optionsEl.appendChild(btn);
  });
  scoreEl.textContent = `Score: ${score}`;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === questions.length - 1;
}

// Check answer
async function checkAnswer(answer, btn) {
  const q = questions[currentIndex];
  const res = await fetch("/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, questionId: q.id, answer })
  });
  const data = await res.json();
  if (data.correct) {
    feedbackEl.textContent = "Correct! ✅";
    feedbackEl.className = "correct";
  } else {
    feedbackEl.textContent = `Wrong ❌ (Correct: ${data.correctAnswer})`;
    feedbackEl.className = "wrong";
  }
  score = data.score;
  scoreEl.textContent = `Score: ${score}`;

  // Disable all option buttons
  [...optionsEl.children].forEach(b => b.disabled = true);
}

// Navigation
prevBtn.onclick = () => {
  if (currentIndex > 0) showQuestion(currentIndex - 1);
};
nextBtn.onclick = () => {
  if (currentIndex < questions.length - 1) showQuestion(currentIndex + 1);
};

// Quit
quitBtn.onclick = showResult;

// Show result
function showResult() {
  quizDiv.classList.add("hidden");
  resultDiv.classList.remove("hidden");
  finalScoreEl.textContent = `Your total score: ${score}`;
}

// Restart
restartBtn.onclick = () => {
  score = 0;
  questions = [];
  currentIndex = 0;
  introDiv.classList.remove("hidden");
  quizDiv.classList.add("hidden");
  resultDiv.classList.add("hidden");
};
