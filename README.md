# Quiz Game Project

A **web-based Quiz Game** built with **Node.js** for the backend and vanilla **HTML/CSS/JS** for the frontend.
The quiz includes **Mathematics, English, and Current Affairs** questions with multiple-choice options, score tracking, and interactive navigation.

---

## Features

* Intro page with quiz instructions.
* 20 questions spanning **Mathematics, English, and Current Affairs**.
* Multiple-choice options for each question.
* **Next / Previous navigation** between questions.
* Immediate feedback on answer selection (correct/wrong + correct answer).
* Score tracking (5 points per correct answer).
* Quit and restart options.
* Fully responsive and styled frontend.

---

## Project Structure

```
project/
├─ frontend/
│  ├─ index.html       # Main HTML page
│  ├─ style.css        # Styling
│  └─ script.js        # Frontend logic
├─ server.js           # Node.js backend server
├─ questions.json      # Quiz questions in JSON format
└─ README.md           # Project documentation
```

---

## Setup & Installation

1. **Clone the repository** (or create a project folder).

2. **Navigate to the project folder**:

```bash
cd project
```

3. **Install Node.js dependencies**:

```bash
npm init -y
npm install express cors
```

4. **Make sure `questions.json` exists** in the root folder.

5. **Start the backend server**:

```bash
node server.js
```

You should see:

```
Quiz server running on port 5000
```

6. **Open the frontend** in your browser:

* Go to: [http://localhost:5000](http://localhost:5000)
* You should see the intro page and can start the quiz.

---

## How It Works

1. User sees an **intro page** with instructions.
2. Clicking **Start Quiz** loads the first question.
3. Users can select an answer:

   * Feedback shows **Correct ✅** or **Wrong ❌** with the correct answer.
4. Navigate using **Next** and **Previous** buttons.
5. Users can **Quit** anytime to see their **final score**.
6. Users can **Restart Quiz** after finishing.

---

## Technologies Used

* **Backend:** Node.js, Express, CORS
* **Frontend:** HTML, CSS, JavaScript
* **Data:** JSON file (`questions.json`) storing quiz questions

---

## License

This project is open-source and free to use.
