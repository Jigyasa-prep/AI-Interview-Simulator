const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

// file upload setup
const upload = multer({ dest: "uploads/" });

// 🔹 Skill-based questions
app.post("/generate", (req, res) => {
  const skill = req.body.skill;

  let questions = [
    `What is ${skill}?`,
    `Explain basic concepts of ${skill}.`,
    `What are applications of ${skill}?`,
    `What are advantages of ${skill}?`,
    `What are limitations of ${skill}?`
  ];

  res.json({ questions });
});

// 🔹 Resume-based questions
app.post("/upload-resume", upload.single("resume"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.json({ questions: [] });
  }

  const fs = require("fs");

  try {
    let buffer = fs.readFileSync(file.path);
    let text = buffer.toString("utf8");

    console.log("RESUME TEXT:", text);

    let questions = [];

    // smart extraction
    if (text.toLowerCase().includes("python")) {
      questions.push("Explain your experience with Python.");
    }

    if (text.toLowerCase().includes("react")) {
      questions.push("How have you used React in your projects?");
    }

    if (text.toLowerCase().includes("mongodb")) {
      questions.push("How do you manage data in MongoDB?");
    }

    if (text.toLowerCase().includes("project")) {
      questions.push("Explain one of your projects in detail.");
    }

    if (text.toLowerCase().includes("data structures")) {
      questions.push("What data structures are you comfortable with?");
    }

    if (questions.length === 0) {
      questions = [
        "Tell me about yourself.",
        "What are your strengths?",
        "Why should we hire you?"
      ];
    }

    res.json({ questions });

  } catch (err) {
    res.json({ questions: ["Error reading resume"] });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});