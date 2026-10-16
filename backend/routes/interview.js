const express = require('express');
const router = express.Router();
const multer = require('multer');
const PDFParser = require('pdf2json');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

// PDF Buffer Parser
function parsePDFBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', () => {
      try {
        const text = decodeURIComponent(pdfParser.getRawTextContent() || '');
        resolve(text.replace(/\r?\n|\r/g, ' ').slice(0, 3000));
      } catch (e) {
        resolve(pdfParser.getRawTextContent().slice(0, 3000));
      }
    });
    pdfParser.parseBuffer(buffer);
  });
}

// Sleep helper function for automatic retry
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// High-demand resilient generation with automatic retry and model fallback
async function generateWithFallback(contents) {
  // Stable multi-tier model list
  const models = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-3.8-flash'
  ];

  let lastError;

  for (const model of models) {
    // Har model ko 2 attempts denge with a tiny delay
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: { responseMimeType: 'application/json' }
        });
        return response;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} attempt ${attempt} failed: ${err.message || err.status}`);
        if (attempt < 2) {
          await wait(1200); // 1.2s wait before retrying same model
        }
      }
    }
  }

  throw lastError;
}

// Route 1: Interview Start
router.post('/start', upload.single('resume'), async (req, res) => {
  try {
    const { mode, role, experienceLevel } = req.body;
    let resumeText = '';
    let promptIntro = '';

    if (mode === 'resume' && req.file) {
      try {
        resumeText = await parsePDFBuffer(req.file.buffer);
      } catch (parseErr) {
        console.warn('PDF read fallback:', parseErr);
        resumeText = 'General Software Developer Profile';
      }

      promptIntro = `You are a technical interviewer interviewing a candidate based on their resume summary:
"${resumeText}"
Give a 1-sentence friendly greeting and ask the first question based on their listed skills or projects.`;
    } else {
      promptIntro = `You are an interviewer interviewing for "${role || 'Frontend Developer'}" at "${experienceLevel || 'Fresher'}" level. Give 1 short greeting and ask the first conceptual question.`;
    }

    const prompt = `${promptIntro}\nReturn JSON strictly with format:\n{\n  "intro": "greeting",\n  "question": "first question"\n}`;
    const response = await generateWithFallback(prompt);

    const data = JSON.parse(response.text);
    res.json({
      success: true,
      resumeContext: resumeText,
      intro: data.intro,
      question: data.question
    });
  } catch (err) {
    console.error("Final Server Error:", err);
    res.status(500).json({ error: 'AI server busy hai. Kripya 2-3 second ruk kar dobara click karein.' });
  }
});

// Route 2: Answer Evaluate
router.post('/evaluate', async (req, res) => {
  try {
    const { mode, role, resumeContext, history, userAnswer } = req.body;
    const context = mode === 'resume' && resumeContext ? `Resume Context: ${resumeContext}` : `Role: ${role}`;

    const prompt = `
      You are an interviewer. Context: ${context}
      Chat History: ${JSON.stringify(history)}
      Candidate Answer: "${userAnswer}"
      
      Tasks:
      1. Give brief feedback (1-2 sentences) and score out of 10.
      2. Ask the next question.
      
      Return JSON strictly:
      {
        "feedback": "...",
        "score": 8,
        "nextQuestion": "..."
      }
    `;

    const response = await generateWithFallback(prompt);
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error("Evaluation Error:", err);
    res.status(500).json({ error: 'Evaluation me issue aaya, dobara submit karein.' });
  }
});

// Route 3: Final Report
router.post('/report', async (req, res) => {
  try {
    const { mode, role, history, scores } = req.body;

    const prompt = `
      You are an expert technical interviewer giving a final evaluation report.
      Context: ${mode === 'resume' ? 'Resume-based Interview' : `Role: ${role}`}
      Complete Transcript & Q&A History:
      ${JSON.stringify(history)}
      Scores: ${JSON.stringify(scores || [])}

      Generate an end-of-interview report.
      Return JSON strictly in this structure:
      {
        "overallScore": 8.5,
        "summary": "1-2 sentences summarizing overall performance.",
        "strengths": ["point 1", "point 2"],
        "areasForImprovement": ["point 1", "point 2"],
        "keyRecommendations": "Advice for upcoming real interviews."
      }
    `;

    const response = await generateWithFallback(prompt);
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error("Report Generation Error:", err);
    res.status(500).json({ error: 'Report generate karne me problem aayi.' });
  }
});

module.exports = router;