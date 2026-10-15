import React, { useState } from 'react';
import axios from 'axios';

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
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Interview start hone me issue aaya!');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Answer & Check Question Limit
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('Kripya apna answer likhein.');
      return;
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

      // Agar max questions complete ho chuke hain, toh report trigger karein
      if (questionCount >= MAX_QUESTIONS) {
        generateFinalReport(updatedHistory, updatedScores);
      } else {
        setQuestionCount((prev) => prev + 1);
        setCurrentQuestion(res.data.nextQuestion);
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
    } catch (err) {
      console.error(err);
      alert('Report generate nahi ho payi.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset & Restart
  const handleReset = () => {
    setInterviewStarted(false);
    setInterviewFinished(false);
    setFinalReport(null);
    setFeedback(null);
    setHistory([]);
    setScores([]);
  };

  return (
    <div style={{ maxWidth: '750px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#2563eb', marginBottom: '8px' }}>AI Mock Interviewer</h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '30px' }}>AI-Powered Realtime Technical Assessment</p>

      {/* Screen 1: Setup */}
      {!interviewStarted && !interviewFinished && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>Interview Configuration</h3>
          
          <div style={{ marginBottom: '18px' }}>
            <span style={{ marginRight: '16px', fontWeight: '600' }}>Select Mode:</span>
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
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Target Job Role:</label>
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
                  <option value="Fresher">Fresher (0 years)</option>
                  <option value="Junior (1-2 years)">Junior (1-2 years)</option>
                  <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
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
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Initializing Interview...' : 'Start Interview'}
          </button>
        </div>
      )}

      {/* Screen 2: Active Q&A Session */}
      {interviewStarted && !interviewFinished && (
        <div>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
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
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
              <strong>AI Greeting:</strong> {intro}
            </div>
          )}

          <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '18px', background: '#fff', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#64748b', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em' }}>Question {questionCount}</h4>
            <p style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500', margin: 0 }}>{currentQuestion}</p>
          </div>

          {feedback && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px 0', color: '#166534', fontWeight: '600' }}>Last Answer Score: {feedback.score} / 10</p>
              <p style={{ margin: 0, color: '#15803d', fontSize: '14px' }}><strong>Feedback:</strong> {feedback.feedback}</p>
            </div>
          )}

          <div>
            <textarea
              rows="4"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your technical response here..."
              style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
            />
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

      {/* Screen 3: Final Scorecard & Performance Report */}
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