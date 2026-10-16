import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Browser SpeechRecognition compatibility helper
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [mode, setMode] = useState('role');
  const [role, setRole] = useState('Frontend Developer');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [resumeFile, setResumeFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);

  const [intro, setIntro] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionCount, setQuestionCount] = useState(1);
  const MAX_QUESTIONS = 5;

  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [scores, setScores] = useState([]);
  const [resumeContext, setResumeContext] = useState('');
  const [history, setHistory] = useState([]);
  const [finalReport, setFinalReport] = useState(null);

  // --- Voice Features State ---
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech-to-Text
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // AI Text-to-Speech (Speaker) Function
  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Purani aawaz stop karein
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Mic Toggle
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Aapka browser Speech Recognition support nahi karta. Chrome use karein.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // 1. Start Interview
  const handleStartInterview = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    setScores([]);
    setQuestionCount(1);
    setInterviewFinished(false);
    setFinalReport(null);

    const formData = new FormData();
    formData.append('mode', mode);
    formData.append('role', role);
    formData.append('experienceLevel', experienceLevel);

    if (mode === 'resume') {
      if (!resumeFile) {
        alert('Kripya pehle resume PDF select karein!');
        setLoading(false);
        return;
      }
      formData.append('resume', resumeFile);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/interview/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setIntro(response.data.intro);
        setCurrentQuestion(response.data.question);
        setResumeContext(response.data.resumeContext || '');
        setHistory([{ role: 'interviewer', content: response.data.question }]);
        setInterviewStarted(true);

        // AI sawal bolega
        speakText(`${response.data.intro}. First question: ${response.data.question}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Interview start hone me issue aaya!');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Answer
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('Kripya apna answer bol kar ya likh kar submit karein.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setLoading(true);
    try {
      const payload = {
        mode,
        role,
        resumeContext,
        history,
        userAnswer,
      };

      const res = await axios.post('http://localhost:5000/api/interview/evaluate', payload);
      setFeedback(res.data);
      const updatedScores = [...scores, res.data.score];
      setScores(updatedScores);

      const updatedHistory = [
        ...history,
        { role: 'candidate', content: userAnswer },
        { role: 'interviewer', content: res.data.nextQuestion },
      ];
      setHistory(updatedHistory);
      setUserAnswer('');

      if (questionCount >= MAX_QUESTIONS) {
        generateFinalReport(updatedHistory, updatedScores);
      } else {
        setQuestionCount((prev) => prev + 1);
        setCurrentQuestion(res.data.nextQuestion);
        // AI agla question bolega
        speakText(`Feedback: ${res.data.feedback}. Next question: ${res.data.nextQuestion}`);
      }
    } catch (err) {
      console.error(err);
      alert('Answer evaluate karne me error aaya!');
    } finally {
      setLoading(false);
    }
  };

  // 3. Generate Final Report
  const generateFinalReport = async (chatHistory = history, currentScores = scores) => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/interview/report', {
        mode,
        role,
        history: chatHistory,
        scores: currentScores,
      });
      setFinalReport(res.data);
      setInterviewFinished(true);
      speakText(`Interview completed. Your overall score is ${res.data.overallScore} out of 10.`);
    } catch (err) {
      console.error(err);
      alert('Report generate nahi ho payi.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset & Restart
  const handleReset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setInterviewStarted(false);
    setInterviewFinished(false);
    setFinalReport(null);
    setFeedback(null);
    setHistory([]);
    setScores([]);
  };

  return (
    <div style={{ maxWidth: '760px', margin: '30px auto', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#2563eb', margin: '0 0 4px 0', fontSize: '28px' }}>AI Mock Interviewer</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Real-Time Role & Resume Technical Screener</p>
        </div>

        {/* Voice Toggle Switch */}
        <button
          onClick={() => {
            if (voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
            setVoiceEnabled(!voiceEnabled);
          }}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid #cbd5e1',
            background: voiceEnabled ? '#ecfdf5' : '#f1f5f9',
            color: voiceEnabled ? '#059669' : '#64748b',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {voiceEnabled ? '🔊 AI Voice: ON' : '🔇 AI Voice: OFF'}
        </button>
      </div>

      {/* Screen 1: Setup */}
      {!interviewStarted && !interviewFinished && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>Configure Interview</h3>
          
          <div style={{ marginBottom: '18px' }}>
            <span style={{ marginRight: '16px', fontWeight: '600' }}>Select Track:</span>
            <label style={{ marginRight: '16px', cursor: 'pointer' }}>
              <input type="radio" value="role" checked={mode === 'role'} onChange={() => setMode('role')} /> Role Wise
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="radio" value="resume" checked={mode === 'resume'} onChange={() => setMode('resume')} /> Resume Wise
            </label>
          </div>

          {mode === 'role' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Target Role:</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Experience Level:</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="Fresher">Fresher (0-1 yrs)</option>
                  <option value="Junior (1-2 years)">Junior (1-2 yrs)</option>
                  <option value="Mid-Level (3-5 years)">Mid-Level (3-5 yrs)</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Upload Resume (PDF):</label>
              <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} />
            </div>
          )}

          <button
            onClick={handleStartInterview}
            disabled={loading}
            style={{
              marginTop: '22px',
              width: '100%',
              padding: '12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Starting Interview...' : 'Start Interview'}
          </button>
        </div>
      )}

      {/* Screen 2: Active Interview */}
      {interviewStarted && !interviewFinished && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
              Question {questionCount} of {MAX_QUESTIONS}
            </span>
            <button
              onClick={() => generateFinalReport()}
              disabled={loading}
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
            >
              End Interview Early
            </button>
          </div>

          {intro && (
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              <strong>AI Greeting:</strong> {intro}
            </div>
          )}

          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '18px', background: '#fff', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Question {questionCount}</span>
              <button
                onClick={() => speakText(currentQuestion)}
                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                🔊 Repeat Question
              </button>
            </div>
            <p style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500', margin: 0 }}>{currentQuestion}</p>
          </div>

          {feedback && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px 0', color: '#166534', fontWeight: '600' }}>Score: {feedback.score} / 10</p>
              <p style={{ margin: 0, color: '#15803d', fontSize: '14px' }}><strong>Feedback:</strong> {feedback.feedback}</p>
            </div>
          )}

          {/* Answer Box + Mic Controls */}
          <div>
            <div style={{ position: 'relative' }}>
              <textarea
                rows="4"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer, or click the mic button to speak..."
                style={{ width: '100%', padding: '12px', paddingRight: '50px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              />
              
              {/* Mic Button inside text box */}
              <button
                onClick={toggleListening}
                type="button"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: isListening ? '#ef4444' : '#f1f5f9',
                  color: isListening ? 'white' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
                title={isListening ? 'Stop Speaking' : 'Start Speaking'}
              >
                {isListening ? '🛑' : '🎤'}
              </button>
            </div>

            {isListening && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: '500' }}>
                ● Mic active: Listening to your response...
              </p>
            )}

            <button
              onClick={handleSubmitAnswer}
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px'
              }}
            >
              {loading ? 'Evaluating...' : questionCount === MAX_QUESTIONS ? 'Submit & View Report' : 'Submit Answer'}
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Final Scorecard */}
      {interviewFinished && finalReport && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ color: '#0f172a', margin: '0 0 6px 0' }}>Interview Performance Report</h2>
            <div style={{ display: 'inline-block', backgroundColor: '#dbeafe', color: '#1e40af', padding: '8px 20px', borderRadius: '30px', fontSize: '22px', fontWeight: 'bold', marginTop: '10px' }}>
              Overall Score: {finalReport.overallScore} / 10
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#334155', marginBottom: '6px' }}>Executive Summary</h4>
            <p style={{ color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: 0 }}>{finalReport.summary}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
              <h4 style={{ color: '#166534', margin: '0 0 8px 0' }}>Key Strengths</h4>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#15803d', fontSize: '14px' }}>
                {finalReport.strengths?.map((item, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>)}
              </ul>
            </div>

            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
              <h4 style={{ color: '#991b1b', margin: '0 0 8px 0' }}>Areas for Improvement</h4>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#b91c1c', fontSize: '14px' }}>
                {finalReport.areasForImprovement?.map((item, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ background: '#fdf4ff', border: '1px solid #fae8ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h4 style={{ color: '#86198f', margin: '0 0 6px 0' }}>Key Recommendations</h4>
            <p style={{ color: '#701a75', margin: 0, fontSize: '14px' }}>{finalReport.keyRecommendations}</p>
          </div>

          <button
            onClick={handleReset}
            style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
          >
            Start New Interview
          </button>
        </div>
      )}
    </div>
  );
}

export default App;