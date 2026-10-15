const express = require('express');
const router = express.Router();
const multer = require('multer');
const PDFParser = require('pdf2json');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

// Reliable PDF text extraction function
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

// 503 High Demand handle karne ke liye auto-fallback helper
async function generateWithFallback(contents) {
  // Agar ek model busy ho, toh list me agla try karega
  const models = ['gemini-3.8-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  let lastError;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: { responseMimeType: 'application/json' }
      });
      return response;
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} busy/failed (status: ${err?.status || err?.code}), trying fallback...`);
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
        console.warn('PDF read issue, using fallback text:', parseErr);
        resumeText = 'General Software Developer Profile';
      }

      promptIntro = `You are an interviewer conducting a technical interview based on this candidate's resume summary:
"${resumeText}"
Give a 1-sentence polite greeting acknowledging their profile, and then ask the very first interview question based on their technical skills or projects.`;
    } else {
      promptIntro = `You are a technical interviewer interviewing for the role "${role || 'Software Developer'}" with experience level "${experienceLevel || 'Fresher'}". Start with 1 short greeting and ask the first core conceptual question.`;
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
    console.error("Backend Error Detail:", err);
    res.status(500).json({ error: 'AI server par abhi high demand hai. Kripya 5 second baad dobara try karein.' });
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
      1. Give short feedback (1-2 sentences) and score out of 10.
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
    console.error("Backend Error Detail:", err);
    res.status(500).json({ error: 'Evaluation me problem aayi.' });
  }
});

// Route 3: Final Interview Report / Summary
router.post('/report', async (req, res) => {
  try {
    const { mode, role, history, scores } = req.body;

    const prompt = `
      You are an expert technical interviewer giving a final evaluation report.
      Context: ${mode === 'resume' ? 'Resume-based Interview' : `Role: ${role}`}
      Complete Transcript & Q&A History:
      ${JSON.stringify(history)}

      Individual Answer Scores given during the session: ${JSON.stringify(scores || [])}

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