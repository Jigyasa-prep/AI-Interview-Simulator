# 🚀 AI Interview Simulator (Full-Stack)

An intelligent, full-stack mock interview platform designed to simulate real-world technical interviews. Candidates can practice either by choosing a specific engineering role or by uploading their actual PDF resume for a personalized, context-aware screening session powered by Google Gemini.

---

## ✨ Key Features

- **Dual-Mode Interview Assessment:**
  - **Role-Wise Track:** Select target job profile (Frontend, Backend, Full Stack) and experience level (Fresher to Mid-Level).
  - **Resume-Wise Track:** Ingests candidate PDF resumes using stream parsing and tailors questions based on detected tech stacks and real project experience.
- **Dynamic Real-Time Evaluation:** Assesses technical accuracy per response, awarding an instant score out of 10 alongside actionable feedback.
- **Adaptive Multi-Model Fallback Engine:** Resilient backend architecture that gracefully handles API demand spikes (503 status handling) by automatically routing through backup model endpoints.
- **Comprehensive Final Scorecard:** Generates an end-of-interview report featuring an overall performance score, executive summary, core strengths, and targeted areas for improvement.

---

## 🛠️ Architecture & Tech Stack

```text
┌─────────────────┐         JSON / FormData        ┌──────────────────┐         Prompt / JSON Schema        ┌─────────────────────────┐
│  React Frontend │ ◄────────────────────────────► │  Express Backend │ ◄──────────────────────────────────► │  Google Gemini API      │
│  (Vite + Hooks) │      (Port: 5173 / Axios)      │   (Node.js REST) │      (SDK: @google/genai)        │  (gemini-3.8-flash)     │
└─────────────────┘                                └─────────┬────────┘                                     └─────────────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │    pdf2json     │
                                                    │  (PDF Extractor)│
                                                    └─────────────────┘


Frontend
Framework: React 19 (via Vite)

Networking: Axios for multipart form data and REST communication

State Management: React Hooks (useState, useEffect)

Backend
Runtime & Server: Node.js & Express.js

File Handling & Parsing: multer (in-memory buffer storage) & pdf2json

AI Integration: Google GenAI SDK (@google/genai) with structured JSON schema responses

Security: cors middleware & dotenv for environment variable isolation

📂 Repository Structure
Plaintext
AI-Interview-Simulator/
├── backend/
│   ├── routes/
│   │   └── interview.js    # Core endpoints: /start, /evaluate, /report
│   ├── package.json
│   └── server.js           # Server entry point & middleware config
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application container & state logic
│   │   ├── main.jsx        # Root DOM mount
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
⚙️ Getting Started Locally
Prerequisites
Node.js (v18 or higher recommended)

A Google Gemini API Key (Get one at Google AI Studio)
