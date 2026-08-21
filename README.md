# ⚡ QuizVerse - Knowledge Arena

A state-of-the-art, gamified **Quiz Game Web Application** built with **Node.js/Express** on the backend and **Vanilla HTML5, CSS3 & JavaScript** on the frontend.

Features a modern cyber-glass aesthetic, Web Audio API sound synthesis, canvas celebration confetti, multi-category question banks with detailed explanations, streak combos, and interactive analytics.

---

## 🌟 Key Features

* 🎮 **3 Game Modes**:
  * **⚡ Blitz Mode**: 15-second countdown timer per question with speed bonus scoring!
  * **🧘 Zen Mode**: Untimed, pressure-free quiz to learn and explore at your pace.
  * **❤️ Survival Mode**: 3-Lives sudden death challenge.
* 📚 **72+ Verified Questions with Explanations across 6 Categories**:
  * 🧮 **Mathematics** (Arithmetic, Algebra, Geometry, Logic)
  * 📖 **English & Vocabulary** (Grammar, Idioms, Antonyms & Synonyms)
  * 🔬 **Science & Nature** (Physics, Chemistry, Biology, Astronomy)
  * 💻 **Technology & Computing** (Programming, Hardware, Web, AI)
  * 🌍 **World History & Geography** (Civilizations, Capitals, Landmarks)
  * ⚡ **Current Affairs & General Knowledge** (Culture, Sports, Global Records)
* 💡 **Lifelines**:
  * **50:50**: Strips away 2 incorrect choices.
  * **+10s Freeze**: Freezes time and adds extra seconds in Blitz mode.
* 🔥 **Streak & Combo Multipliers**: Consecutively answer correctly to boost your score with exponential streak fire bonuses.
* 🔊 **Web Audio Synthesizer**: Built-in sound effects (correct chimes, wrong buzzers, countdown ticks, victory fanfares) with instant mute toggle.
* 🎊 **Canvas Confetti & Trophy Ranks**: S-Rank Grandmaster, A-Rank Scholar, B-Rank Challenger with particle fireworks.
* 📝 **Question-by-Question Review**: Comprehensive post-game review revealing your answers, correct answers, and educational explanations.
* 🏆 **Leaderboard**: High-score tracking with accuracy rating and topic breakdown.
* ⌨️ **Full Keyboard Shortcuts**: Use `A`-`D` or `1`-`4` to pick options, `Enter` / `ArrowRight` to advance.

---

## 📁 Project Structure

```
QUIZ-GAME/
├── frontend/
│   ├── index.html       # Modern semantic markup & view panels
│   ├── style.css        # Cyber-glass design system & micro-interactions
│   └── script.js        # Web Audio, confetti, HUD, and game state controller
├── server.js            # Express server with RESTful API & session tracking
├── questions.json       # 72+ verified questions database with explanations
├── package.json         # Project metadata and dependencies
└── README.md            # Documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Running the Server
Start the Express server:
```bash
npm start
```
Or directly with Node:
```bash
node server.js
```

You will see:
```
Loaded 72 questions across multiple categories.
Quiz server running at http://localhost:5000
```

### 4. Play the Quiz
Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | Returns all available categories and question counts |
| `GET` | `/api/quiz?category=...&count=10` | Generates a randomized quiz question set |
| `GET` | `/api/question/random` | Returns a random question |
| `POST` | `/api/answer` | Validates answer, computes streak bonus & returns explanation |
| `GET` | `/api/session/state?session=...` | Retrieves session summary & accuracy stats |
| `GET` | `/api/leaderboard` | Returns top high scores |
| `POST` | `/api/leaderboard` | Submits new high score |

---

## 📜 License

Open source and free to use under the ISC License.
