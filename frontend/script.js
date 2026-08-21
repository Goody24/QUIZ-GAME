/**
 * QUIZVERSE - Main Frontend Application Logic
 * Modern, gamified quiz engine with Web Audio synthesizer, canvas confetti, confirmation safety, and rich state management.
 */

// ============================================================================
// 1. AUDIO SYNTHESIZER (Web Audio API)
// ============================================================================
class AudioController {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("quizverse_muted") === "true";
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("quizverse_muted", this.muted.toString());
    return this.muted;
  }

  playTone(freq, type = "sine", duration = 0.15, delay = 0, gainVal = 0.15) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      // Audio context policy fallback
    }
  }

  playCorrect() {
    // Joyful ascending arpeggio (C5 -> E5 -> G5 -> C6)
    this.playTone(523.25, "triangle", 0.1, 0, 0.15);
    this.playTone(659.25, "triangle", 0.1, 0.08, 0.15);
    this.playTone(783.99, "triangle", 0.15, 0.16, 0.18);
    this.playTone(1046.50, "sine", 0.25, 0.24, 0.2);
  }

  playWrong() {
    // Low buzz
    this.playTone(180, "sawtooth", 0.2, 0, 0.18);
    this.playTone(140, "sawtooth", 0.3, 0.1, 0.15);
  }

  playClick() {
    this.playTone(800, "sine", 0.04, 0, 0.08);
  }

  playSelect() {
    // Soft confirmation chime
    this.playTone(650, "sine", 0.06, 0, 0.1);
  }

  playTick() {
    this.playTone(1200, "triangle", 0.03, 0, 0.05);
  }

  playFanfare() {
    // Victory fanfare chords
    const chords = [
      { f: 523.25, t: 0 },
      { f: 659.25, t: 0.1 },
      { f: 783.99, t: 0.2 },
      { f: 1046.50, t: 0.3 },
      { f: 1318.51, t: 0.45 },
      { f: 1567.98, t: 0.6 }
    ];
    chords.forEach(c => this.playTone(c.f, "triangle", 0.35, c.t, 0.2));
  }
}

// ============================================================================
// 2. CANVAS CONFETTI CELEBRATION ENGINE
// ============================================================================
class ConfettiEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext("2d");
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire(duration = 3000) {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    const colors = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#06B6D4", "#F43F5E"];
    const count = 120;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: this.canvas.height / 2 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1.2) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        gravity: 0.35
      });
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.particles.forEach(p => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - elapsed / duration);

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        this.ctx.restore();
      });

      if (elapsed < duration) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles = [];
      }
    };

    if (this.animationId) cancelAnimationFrame(this.animationId);
    animate();
  }
}

// ============================================================================
// 3. GAME CONTROLLER & STATE
// ============================================================================
const sound = new AudioController();
const confetti = new ConfettiEngine("confettiCanvas");

const state = {
  session: "qv_" + Math.random().toString(36).substring(2, 9),
  category: "All",
  gameMode: "blitz", // "blitz" | "zen" | "survival"
  questionCount: 10,
  requireConfirmation: true, // "Are you sure?" confirmation toggle
  selectedPendingKey: null,  // Current choice waiting for confirmation
  questions: [],
  currentIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  lives: 3,
  timerInterval: null,
  timeLeft: 15,
  maxTime: 15,
  lifelines: {
    fiftyFiftyUsed: false,
    freezeUsed: false
  },
  answers: {} // questionId -> { selected, isCorrect, correctAnswer, explanation, pointsEarned }
};

// UI Element References
const views = {
  lobby: document.getElementById("lobbyView"),
  quiz: document.getElementById("quizView"),
  results: document.getElementById("resultsView")
};

const dom = {
  brandLogo: document.getElementById("brandLogo"),
  soundToggleBtn: document.getElementById("soundToggleBtn"),
  soundIcon: document.getElementById("soundIcon"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  helpBtn: document.getElementById("helpBtn"),
  
  categoryGrid: document.getElementById("categoryGrid"),
  lengthChips: document.getElementById("lengthChips"),
  confirmToggleInput: document.getElementById("confirmToggleInput"),
  startQuizBtn: document.getElementById("startQuizBtn"),

  hudCategoryIcon: document.getElementById("hudCategoryIcon"),
  hudCategoryText: document.getElementById("hudCategoryText"),
  hudDifficultyTag: document.getElementById("hudDifficultyTag"),
  hudScore: document.getElementById("hudScore"),
  streakBadge: document.getElementById("streakBadge"),
  streakText: document.getElementById("streakText"),
  timerWrapper: document.getElementById("timerWrapper"),
  timerProgress: document.getElementById("timerProgress"),
  timerText: document.getElementById("timerText"),
  livesDisplay: document.getElementById("livesDisplay"),

  progressBar: document.getElementById("progressBar"),
  progressQuestionNum: document.getElementById("progressQuestionNum"),
  progressPercent: document.getElementById("progressPercent"),

  questionText: document.getElementById("questionText"),
  optionsContainer: document.getElementById("optionsContainer"),
  lifeline5050: document.getElementById("lifeline5050"),
  lifelineFreeze: document.getElementById("lifelineFreeze"),
  
  confirmationBar: document.getElementById("confirmationBar"),
  confirmSelectedKey: document.getElementById("confirmSelectedKey"),
  cancelSelectionBtn: document.getElementById("cancelSelectionBtn"),
  confirmAnswerBtn: document.getElementById("confirmAnswerBtn"),

  explanationBox: document.getElementById("explanationBox"),
  feedbackStatusIcon: document.getElementById("feedbackStatusIcon"),
  feedbackStatusTitle: document.getElementById("feedbackStatusTitle"),
  pointsEarnedBadge: document.getElementById("pointsEarnedBadge"),
  explanationText: document.getElementById("explanationText"),

  prevQuestionBtn: document.getElementById("prevQuestionBtn"),
  nextQuestionBtn: document.getElementById("nextQuestionBtn"),
  quitQuizBtn: document.getElementById("quitQuizBtn"),

  resultsTitle: document.getElementById("resultsTitle"),
  resultsSubtitle: document.getElementById("resultsSubtitle"),
  rankBadge: document.getElementById("rankBadge"),
  finalScoreVal: document.getElementById("finalScoreVal"),
  maxPossibleScore: document.getElementById("maxPossibleScore"),
  statAccuracy: document.getElementById("statAccuracy"),
  statCorrect: document.getElementById("statCorrect"),
  statMaxStreak: document.getElementById("statMaxStreak"),
  statRank: document.getElementById("statRank"),
  
  playerNameInput: document.getElementById("playerNameInput"),
  saveScoreBtn: document.getElementById("saveScoreBtn"),
  saveStatus: document.getElementById("saveStatus"),
  
  toggleReviewBtn: document.getElementById("toggleReviewBtn"),
  reviewList: document.getElementById("reviewList"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  changeTopicBtn: document.getElementById("changeTopicBtn"),

  leaderboardModal: document.getElementById("leaderboardModal"),
  closeLeaderboardBtn: document.getElementById("closeLeaderboardBtn"),
  leaderboardTbody: document.getElementById("leaderboardTbody"),

  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn")
};

// ============================================================================
// 4. INITIALIZATION & EVENT HANDLERS
// ============================================================================
function initApp() {
  updateSoundIcon();

  // Category selection handler
  dom.categoryGrid.querySelectorAll(".cat-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      sound.playClick();
      dom.categoryGrid.querySelectorAll(".cat-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.category = chip.dataset.category;
    });
  });

  // Game Mode radio selection handler
  document.querySelectorAll("input[name='gameMode']").forEach(radio => {
    radio.addEventListener("change", e => {
      sound.playClick();
      document.querySelectorAll(".mode-option").forEach(o => o.classList.remove("active"));
      e.target.closest(".mode-option").classList.add("active");
      state.gameMode = e.target.value;
    });
  });

  // Question Length selection handler
  dom.lengthChips.querySelectorAll(".len-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      sound.playClick();
      dom.lengthChips.querySelectorAll(".len-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.questionCount = parseInt(chip.dataset.count, 10);
    });
  });

  // Confirmation toggle setting
  if (dom.confirmToggleInput) {
    dom.confirmToggleInput.addEventListener("change", e => {
      state.requireConfirmation = e.target.checked;
      sound.playClick();
    });
  }

  // Navigation & Modals
  dom.brandLogo.addEventListener("click", () => switchView("lobby"));
  dom.soundToggleBtn.addEventListener("click", () => {
    const isMuted = sound.toggleMute();
    updateSoundIcon();
  });

  dom.leaderboardBtn.addEventListener("click", () => {
    sound.playClick();
    loadAndShowLeaderboard();
  });
  dom.closeLeaderboardBtn.addEventListener("click", () => dom.leaderboardModal.classList.add("hidden"));

  dom.helpBtn.addEventListener("click", () => {
    sound.playClick();
    dom.helpModal.classList.remove("hidden");
  });
  dom.closeHelpBtn.addEventListener("click", () => dom.helpModal.classList.add("hidden"));

  // Start & Play Again
  dom.startQuizBtn.addEventListener("click", startQuiz);
  dom.playAgainBtn.addEventListener("click", startQuiz);
  dom.changeTopicBtn.addEventListener("click", () => switchView("lobby"));

  // Confirmation Action Bar Buttons
  dom.cancelSelectionBtn.addEventListener("click", cancelPendingSelection);
  dom.confirmAnswerBtn.addEventListener("click", confirmAndSubmitAnswer);

  // Quiz Arena Buttons
  dom.prevQuestionBtn.addEventListener("click", () => {
    sound.playClick();
    if (state.currentIndex > 0) {
      renderQuestion(state.currentIndex - 1);
    }
  });

  dom.nextQuestionBtn.addEventListener("click", () => {
    sound.playClick();
    if (state.currentIndex < state.questions.length - 1) {
      renderQuestion(state.currentIndex + 1);
    } else {
      endQuiz();
    }
  });

  dom.quitQuizBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to quit the quiz? Your current score will be calculated.")) {
      endQuiz();
    }
  });

  // Lifelines
  dom.lifeline5050.addEventListener("click", use5050Lifeline);
  dom.lifelineFreeze.addEventListener("click", useFreezeLifeline);

  // Review Toggle
  dom.toggleReviewBtn.addEventListener("click", () => {
    const isHidden = dom.reviewList.classList.toggle("hidden");
    dom.toggleReviewBtn.textContent = isHidden ? "Expand Details ▼" : "Collapse Details ▲";
  });

  // Save Score Form
  dom.saveScoreBtn.addEventListener("click", submitScoreToLeaderboard);

  // Keyboard navigation shortcuts
  window.addEventListener("keydown", handleKeydown);
}

function updateSoundIcon() {
  dom.soundIcon.textContent = sound.muted ? "🔇" : "🔊";
}

function switchView(viewName) {
  Object.keys(views).forEach(v => {
    views[v].classList.remove("active");
  });
  if (views[viewName]) {
    views[viewName].classList.add("active");
  }
}

// ============================================================================
// 5. QUIZ CORE FLOW
// ============================================================================
async function startQuiz() {
  sound.playClick();
  state.session = "qv_" + Math.random().toString(36).substring(2, 9);
  state.currentIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.lives = 3;
  state.selectedPendingKey = null;
  state.answers = {};
  state.lifelines = { fiftyFiftyUsed: false, freezeUsed: false };

  dom.startQuizBtn.disabled = true;
  dom.startQuizBtn.textContent = "Loading Questions...";

  try {
    const url = `/api/quiz?session=${state.session}&category=${encodeURIComponent(state.category)}&count=${state.questionCount}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error || !data.questions || data.questions.length === 0) {
      alert("Failed to load questions. Please check server connection.");
      dom.startQuizBtn.disabled = false;
      dom.startQuizBtn.textContent = "Start Challenge 🚀";
      return;
    }

    state.questions = data.questions;

    // Configure HUD based on Game Mode
    if (state.gameMode === "blitz") {
      dom.timerWrapper.classList.remove("hidden");
      dom.livesDisplay.classList.add("hidden");
      dom.lifelineFreeze.disabled = false;
    } else if (state.gameMode === "survival") {
      dom.timerWrapper.classList.add("hidden");
      dom.livesDisplay.classList.remove("hidden");
      dom.lifelineFreeze.disabled = true;
      updateLivesDisplay();
    } else { // zen
      dom.timerWrapper.classList.add("hidden");
      dom.livesDisplay.classList.add("hidden");
      dom.lifelineFreeze.disabled = true;
    }

    dom.lifeline5050.disabled = false;

    switchView("quiz");
    renderQuestion(0);
  } catch (err) {
    console.error("Error starting quiz:", err);
    alert("Connection error when starting quiz.");
  } finally {
    dom.startQuizBtn.disabled = false;
    dom.startQuizBtn.innerHTML = `<span class="btn-text">Start Challenge</span><span class="btn-arrow">🚀</span>`;
  }
}

function renderQuestion(index) {
  clearInterval(state.timerInterval);
  state.currentIndex = index;
  state.selectedPendingKey = null;
  const q = state.questions[index];

  // Header metadata
  dom.hudCategoryText.textContent = q.category;
  dom.hudCategoryIcon.textContent = getCategoryIcon(q.category);
  dom.hudDifficultyTag.textContent = q.difficulty || "Medium";
  dom.hudDifficultyTag.className = `hud-difficulty ${q.difficulty || "medium"}`;
  dom.hudScore.textContent = state.score;

  // Streak badge
  dom.streakText.textContent = `Streak ${state.streak}`;
  if (state.streak > 1) {
    dom.streakBadge.classList.add("active-streak");
  } else {
    dom.streakBadge.classList.remove("active-streak");
  }

  // Progress Bar
  const total = state.questions.length;
  const percent = Math.round(((index + 1) / total) * 100);
  dom.progressBar.style.width = `${percent}%`;
  dom.progressQuestionNum.textContent = `Question ${index + 1} of ${total}`;
  dom.progressPercent.textContent = `${percent}%`;

  // Question Prompt
  dom.questionText.textContent = q.question;

  // Reset confirmation bar
  dom.confirmationBar.classList.add("hidden");

  // Render Options
  dom.optionsContainer.innerHTML = "";
  const existingAnswer = state.answers[q.id];

  q.options.forEach((optText, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    const key = optText.trim().charAt(0).toUpperCase();

    // Clean display text (e.g. remove "A. " if present)
    let labelText = optText;
    if (optText.length > 2 && (optText.charAt(1) === '.' || optText.charAt(1) === ')')) {
      labelText = optText.substring(2).trim();
    }

    btn.innerHTML = `
      <span class="opt-badge">${key}</span>
      <span class="opt-text">${labelText}</span>
      <span class="opt-key-hint">${i + 1}</span>
    `;

    btn.dataset.key = key;

    // If question has already been answered in this session
    if (existingAnswer) {
      btn.disabled = true;
      if (key === existingAnswer.correctAnswer) {
        btn.classList.add("correct-choice");
      } else if (key === existingAnswer.selected && !existingAnswer.isCorrect) {
        btn.classList.add("wrong-choice");
      } else {
        btn.classList.add("dimmed");
      }
    } else {
      btn.addEventListener("click", () => handleOptionClick(key, btn));
    }

    dom.optionsContainer.appendChild(btn);
  });

  // Explanation Banner
  if (existingAnswer) {
    showExplanation(existingAnswer.isCorrect, existingAnswer.correctAnswer, existingAnswer.explanation, existingAnswer.pointsEarned);
    dom.nextQuestionBtn.disabled = false;
  } else {
    dom.explanationBox.classList.add("hidden");
    dom.nextQuestionBtn.disabled = true;

    // Start timer if in blitz mode
    if (state.gameMode === "blitz") {
      startTimer();
    }
  }

  // Navigation controls state
  dom.prevQuestionBtn.disabled = index === 0;
  if (index === state.questions.length - 1) {
    dom.nextQuestionBtn.innerHTML = `Finish Quiz <span>🏁</span>`;
  } else {
    dom.nextQuestionBtn.innerHTML = `Next Question <span>➡️</span>`;
  }
}

// ============================================================================
// 6. TIMER & LIFELINES
// ============================================================================
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = state.maxTime;
  updateTimerUI();

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 1;
    updateTimerUI();

    if (state.timeLeft <= 5 && state.timeLeft > 0) {
      sound.playTick();
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      handleTimeOut();
    }
  }, 1000);
}

function updateTimerUI() {
  dom.timerText.textContent = state.timeLeft;
  const circumference = 100;
  const offset = circumference - (state.timeLeft / state.maxTime) * circumference;
  dom.timerProgress.style.strokeDasharray = `${circumference - offset}, ${circumference}`;

  dom.timerProgress.classList.remove("warning", "danger");
  if (state.timeLeft <= 5) {
    dom.timerProgress.classList.add("danger");
  } else if (state.timeLeft <= 9) {
    dom.timerProgress.classList.add("warning");
  }
}

function handleTimeOut() {
  // If user has an option selected when time ran out, submit that option!
  if (state.selectedPendingKey) {
    submitFinalAnswer(state.selectedPendingKey);
  } else {
    submitFinalAnswer("TIMEOUT");
  }
}

function use5050Lifeline() {
  if (state.lifelines.fiftyFiftyUsed) return;
  const currentQ = state.questions[state.currentIndex];
  if (state.answers[currentQ.id]) return; // Already answered

  sound.playClick();
  state.lifelines.fiftyFiftyUsed = true;
  dom.lifeline5050.disabled = true;

  // Disable 2 incorrect options
  const optionBtns = Array.from(dom.optionsContainer.children);
  let disabledCount = 0;

  for (let i = optionBtns.length - 1; i >= 0 && disabledCount < 2; i--) {
    optionBtns[i].classList.add("dimmed");
    optionBtns[i].disabled = true;
    disabledCount++;
  }
}

function useFreezeLifeline() {
  if (state.lifelines.freezeUsed || state.gameMode !== "blitz") return;
  sound.playClick();
  state.lifelines.freezeUsed = true;
  dom.lifelineFreeze.disabled = true;
  state.timeLeft = Math.min(state.timeLeft + 10, 25);
  updateTimerUI();
}

// ============================================================================
// 7. OPTION CLICK, CONFIRMATION ("ARE YOU SURE?") & SUBMISSION
// ============================================================================
function handleOptionClick(key, clickedBtn) {
  const currentQ = state.questions[state.currentIndex];
  if (state.answers[currentQ.id]) return; // already locked in

  // If confirmation is NOT required, submit instantly
  if (!state.requireConfirmation) {
    submitFinalAnswer(key);
    return;
  }

  // If confirmation IS required:
  // If clicking the same option that's already selected, treat as instant confirmation!
  if (state.selectedPendingKey === key) {
    confirmAndSubmitAnswer();
    return;
  }

  // Otherwise, select this option and ask "Are you sure?"
  sound.playSelect();
  state.selectedPendingKey = key;

  // Update visual state on buttons
  const allBtns = Array.from(dom.optionsContainer.children);
  allBtns.forEach(btn => btn.classList.remove("selected-pending"));
  clickedBtn.classList.add("selected-pending");

  // Update and show the confirmation bar
  dom.confirmSelectedKey.textContent = key;
  dom.confirmationBar.classList.remove("hidden");
}

function cancelPendingSelection() {
  sound.playClick();
  state.selectedPendingKey = null;
  const allBtns = Array.from(dom.optionsContainer.children);
  allBtns.forEach(btn => btn.classList.remove("selected-pending"));
  dom.confirmationBar.classList.add("hidden");
}

function confirmAndSubmitAnswer() {
  if (!state.selectedPendingKey) return;
  const keyToSubmit = state.selectedPendingKey;
  state.selectedPendingKey = null;
  dom.confirmationBar.classList.add("hidden");
  submitFinalAnswer(keyToSubmit);
}

async function submitFinalAnswer(selectedKey) {
  clearInterval(state.timerInterval);
  dom.confirmationBar.classList.add("hidden");

  const currentQ = state.questions[state.currentIndex];
  if (state.answers[currentQ.id]) return; // prevent duplicate submissions

  // Calculate speed bonus for Blitz mode
  let timeBonus = 0;
  if (state.gameMode === "blitz" && state.timeLeft > 8) {
    timeBonus = Math.floor((state.timeLeft - 8) / 2); // 1-3 extra pts
  }

  // Disable all option buttons immediately and remove pending styles
  const allBtns = Array.from(dom.optionsContainer.children);
  allBtns.forEach(b => {
    b.disabled = true;
    b.classList.remove("selected-pending");
  });

  try {
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: state.session,
        questionId: currentQ.id,
        answer: selectedKey,
        timeBonus
      })
    });

    const data = await res.json();

    state.score = data.score;
    state.streak = data.streak;
    state.maxStreak = data.maxStreak;
    dom.hudScore.textContent = state.score;
    dom.streakText.textContent = `Streak ${state.streak}`;

    // Store in session answers map
    state.answers[currentQ.id] = {
      selected: selectedKey,
      isCorrect: data.correct,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      pointsEarned: data.pointsEarned
    };

    // Visual styles on options
    allBtns.forEach(btn => {
      const key = btn.dataset.key;
      if (key === data.correctAnswer) {
        btn.classList.add("correct-choice");
      } else if (key === selectedKey && !data.correct) {
        btn.classList.add("wrong-choice");
      } else {
        btn.classList.add("dimmed");
      }
    });

    // Audio & Status
    if (data.correct) {
      sound.playCorrect();
      if (state.streak >= 3) {
        confetti.fire(1500);
      }
    } else {
      sound.playWrong();

      // Handle Survival Mode lives
      if (state.gameMode === "survival") {
        state.lives -= 1;
        updateLivesDisplay();
        if (state.lives <= 0) {
          setTimeout(() => {
            alert("💔 Out of lives! Game Over.");
            endQuiz();
          }, 1200);
          return;
        }
      }
    }

    showExplanation(data.correct, data.correctAnswer, data.explanation, data.pointsEarned);
    dom.nextQuestionBtn.disabled = false;

  } catch (err) {
    console.error("Error submitting answer:", err);
  }
}

function showExplanation(isCorrect, correctAnswer, explanation, pointsEarned) {
  dom.explanationBox.classList.remove("hidden");
  if (isCorrect) {
    dom.feedbackStatusIcon.textContent = "✅";
    dom.feedbackStatusTitle.textContent = "Brilliant! Correct Answer";
    dom.feedbackStatusTitle.style.color = "#6EE7B7";
    dom.pointsEarnedBadge.textContent = `+${pointsEarned} pts`;
    dom.pointsEarnedBadge.classList.remove("hidden");
  } else {
    dom.feedbackStatusIcon.textContent = "❌";
    dom.feedbackStatusTitle.textContent = `Incorrect (Correct: ${correctAnswer})`;
    dom.feedbackStatusTitle.style.color = "#FCA5A5";
    dom.pointsEarnedBadge.classList.add("hidden");
  }
  dom.explanationText.textContent = explanation || "Well done reviewing this question!";
}

function updateLivesDisplay() {
  const hearts = dom.livesDisplay.querySelectorAll(".heart-icon");
  hearts.forEach((h, idx) => {
    if (idx < state.lives) {
      h.classList.remove("lost");
    } else {
      h.classList.add("lost");
    }
  });
}

// ============================================================================
// 8. RESULTS & ANALYTICS
// ============================================================================
async function endQuiz() {
  clearInterval(state.timerInterval);
  switchView("results");

  try {
    const res = await fetch(`/api/session/state?session=${state.session}`);
    const sessionData = await res.json();

    const totalQuestions = state.questions.length;
    const answeredCount = Object.keys(state.answers).length;
    const correctCount = Object.values(state.answers).filter(a => a.isCorrect).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const maxScore = totalQuestions * 10;

    dom.finalScoreVal.textContent = state.score;
    dom.maxPossibleScore.textContent = `/ ${maxScore} base`;
    dom.statAccuracy.textContent = `${accuracy}%`;
    dom.statCorrect.textContent = `${correctCount} / ${totalQuestions}`;
    dom.statMaxStreak.textContent = state.maxStreak;

    // Determine Mastery Rank & Badge
    let rank = "C-Rank";
    let trophy = "🎯";
    let title = "Quiz Finished!";
    let subtitle = "Good effort! Keep practicing to reach the master tiers.";

    if (accuracy >= 90) {
      rank = "S-Rank Grandmaster";
      trophy = "🏆";
      title = "Legendary Mastery!";
      subtitle = "Spectacular intellectual prowess! You aced nearly every question.";
      sound.playFanfare();
      confetti.fire(4000);
    } else if (accuracy >= 75) {
      rank = "A-Rank Scholar";
      trophy = "🥇";
      title = "Superb Performance!";
      subtitle = "Impressive accuracy and depth of knowledge!";
      sound.playFanfare();
      confetti.fire(2500);
    } else if (accuracy >= 50) {
      rank = "B-Rank Challenger";
      trophy = "🥈";
      title = "Solid Attempt!";
      subtitle = "Solid foundation! Review the explanations to sharpen your skills.";
    }

    dom.statRank.textContent = rank;
    dom.rankBadge.textContent = trophy;
    dom.resultsTitle.textContent = title;
    dom.resultsSubtitle.textContent = subtitle;

    // Render Question Review Accordion
    renderReviewSection();

  } catch (err) {
    console.error("Error loading final score:", err);
  }
}

function renderReviewSection() {
  dom.reviewList.innerHTML = "";

  state.questions.forEach((q, idx) => {
    const ans = state.answers[q.id];
    const item = document.createElement("div");
    item.className = `review-item ${ans?.isCorrect ? "correct" : "wrong"}`;

    const statusIcon = ans?.isCorrect ? "✅" : "❌";
    const userChoice = ans?.selected || "None";
    const correctChoice = ans?.correctAnswer || "See Answer";

    item.innerHTML = `
      <div class="ri-top">
        <span class="ri-status">${statusIcon}</span>
        <span class="ri-question">${idx + 1}. ${q.question}</span>
      </div>
      <div class="ri-details">
        <span><strong>Your Answer:</strong> ${userChoice} | <strong>Correct Answer:</strong> ${correctChoice}</span>
        <div class="ri-explanation">${ans?.explanation || q.explanation || "No explanation"}</div>
      </div>
    `;

    dom.reviewList.appendChild(item);
  });
}

// ============================================================================
// 9. LEADERBOARD
// ============================================================================
async function loadAndShowLeaderboard() {
  dom.leaderboardModal.classList.remove("hidden");
  dom.leaderboardTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading scores...</td></tr>`;

  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();

    if (!data.leaderboard || data.leaderboard.length === 0) {
      dom.leaderboardTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No high scores recorded yet!</td></tr>`;
      return;
    }

    dom.leaderboardTbody.innerHTML = "";
    data.leaderboard.forEach((entry, idx) => {
      const tr = document.createElement("tr");
      const medals = ["🥇", "🥈", "🥉"];
      const rankDisplay = medals[idx] || `#${idx + 1}`;

      tr.innerHTML = `
        <td><strong>${rankDisplay}</strong></td>
        <td>${escapeHtml(entry.name)}</td>
        <td>${entry.category || "All"}</td>
        <td>${entry.accuracy || 100}%</td>
        <td><strong style="color:#6EE7B7;">${entry.score} pts</strong></td>
      `;
      dom.leaderboardTbody.appendChild(tr);
    });
  } catch (err) {
    dom.leaderboardTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#EF4444;">Failed to load leaderboard.</td></tr>`;
  }
}

async function submitScoreToLeaderboard() {
  const name = dom.playerNameInput.value.trim();
  if (!name) {
    dom.saveStatus.className = "save-status error";
    dom.saveStatus.textContent = "Please enter your name.";
    return;
  }

  dom.saveScoreBtn.disabled = true;
  dom.saveScoreBtn.textContent = "Submitting...";

  try {
    const answeredCount = Object.keys(state.answers).length;
    const correctCount = Object.values(state.answers).filter(a => a.isCorrect).length;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;

    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        score: state.score,
        category: state.category,
        accuracy
      })
    });

    const data = await res.json();
    dom.saveStatus.className = "save-status success";
    dom.saveStatus.textContent = `Score recorded! You are ranked #${data.rank}! 🏆`;
    dom.playerNameInput.disabled = true;
    dom.saveScoreBtn.textContent = "Saved ✅";
  } catch (err) {
    dom.saveStatus.className = "save-status error";
    dom.saveStatus.textContent = "Error saving score.";
    dom.saveScoreBtn.disabled = false;
    dom.saveScoreBtn.textContent = "Submit 🏆";
  }
}

// ============================================================================
// 10. KEYBOARD SHORTCUTS & HELPERS
// ============================================================================
function handleKeydown(e) {
  // Ignore typing inside text inputs
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  // Modals close with Escape
  if (e.key === "Escape") {
    if (state.selectedPendingKey) {
      cancelPendingSelection();
      return;
    }
    dom.leaderboardModal.classList.add("hidden");
    dom.helpModal.classList.add("hidden");
    return;
  }

  // Arena shortcut controls
  if (views.quiz.classList.contains("active")) {
    const key = e.key.toUpperCase();
    const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D", "A": "A", "B": "B", "C": "C", "D": "D" };

    if (keyMap[key]) {
      const targetKey = keyMap[key];
      const btn = dom.optionsContainer.querySelector(`button[data-key='${targetKey}']`);
      if (btn && !btn.disabled) {
        handleOptionClick(targetKey, btn);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      if (state.selectedPendingKey) {
        e.preventDefault();
        confirmAndSubmitAnswer();
      } else if (!dom.nextQuestionBtn.disabled) {
        e.preventDefault();
        dom.nextQuestionBtn.click();
      }
    } else if (e.key === "ArrowRight") {
      if (!dom.nextQuestionBtn.disabled) {
        dom.nextQuestionBtn.click();
      }
    } else if (e.key === "ArrowLeft") {
      if (!dom.prevQuestionBtn.disabled) {
        dom.prevQuestionBtn.click();
      }
    }
  }
}

function getCategoryIcon(cat) {
  const map = {
    "Mathematics": "🧮",
    "English": "📖",
    "Science & Nature": "🔬",
    "Technology & Computing": "💻",
    "World History & Geography": "🌍",
    "Current Affairs & GK": "⚡"
  };
  return map[cat] || "🌟";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", initApp);
