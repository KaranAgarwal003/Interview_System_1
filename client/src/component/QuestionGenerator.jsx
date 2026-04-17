import React, { useState, useRef, useEffect } from "react";
import { getApiUrl } from "../config/api.js";

const QuestionGenerator = () => {
  const [subject, setSubject] = useState("");
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [lastScore, setLastScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // accumulated Q&A log for the whole session
  const qaLog = useRef([]);
  const startTime = useRef(null);
  const recognitionRef = useRef(null);

  const fetchQuestion = async () => {
    setLoading(true);
    setUserAnswer("");
    try {
      const response = await fetch(getApiUrl("/generate-question", false), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCurrentQuestion(data.question || "No question generated.");
    } catch (error) {
      setCurrentQuestion(`Error: Could not connect to API (${error.message})`);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = async (answer) => {
    if (!answer.trim()) return;
    try {
      const response = await fetch(getApiUrl("/evaluate-answer", false), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, answer }),
      });
      const data = await response.json();
      const rawScore = data.evaluation;
      const numericScore = parseInt(String(rawScore).match(/\d+/)?.[0] ?? "0", 10);
      setLastScore(numericScore);

      // Record this Q&A pair
      qaLog.current.push({ question: currentQuestion, answer, score: numericScore });

      fetchQuestion();
    } catch (err) {
      console.error("Evaluation error:", err);
      setLastScore(null);
      fetchQuestion();
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition not supported."); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let timeout;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join("");
      setUserAnswer(transcript);
      if (event.results[0].isFinal) {
        clearTimeout(timeout);
        evaluateAnswer(transcript);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(() => recognition.stop(), 15000);
      }
    };
    recognition.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") alert("Speech error: " + e.error);
    };
    recognition.onend = () => clearTimeout(timeout);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = () => {
    if (!subject.trim()) { alert("Please enter a subject."); return; }
    qaLog.current = [];
    startTime.current = Date.now();
    setSessionSaved(false);
    setLastScore(null);
    setStarted(true);
    fetchQuestion();
  };

  const handleEndSession = async () => {
    if (qaLog.current.length === 0) { alert("Answer at least one question before ending."); return; }
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(true);
    try {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      await fetch(getApiUrl("/sessions", false), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, qa: qaLog.current, duration }),
      });
      setSessionSaved(true);
      setStarted(false);
      setCurrentQuestion("");
      setLastScore(null);
      qaLog.current = [];
    } catch (err) {
      console.error("Session save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center font-sans">
      {/* Subject input */}
      {!started && (
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
          {sessionSaved && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              Session saved! Your stats on the dashboard are now updated.
            </div>
          )}
          <label className="block text-gray-700 font-semibold mb-2">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject (e.g. React, System Design)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleStart}
            className="w-full mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
          >
            Start Interview
          </button>
        </div>
      )}

      {/* Active session */}
      {started && (
        <>
          {/* Session info bar */}
          <div className="w-full max-w-md mb-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Subject: <strong>{subject}</strong> &middot; {qaLog.current.length} answered
            </span>
            <button
              onClick={handleEndSession}
              disabled={saving}
              className="px-4 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "End & Save"}
            </button>
          </div>

          {/* Question card */}
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            {loading ? (
              <p className="text-gray-400 text-center">Generating question...</p>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Question:</h2>
                <p className="text-gray-700 mb-4">{currentQuestion}</p>
                <button
                  onClick={startRecording}
                  className="w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition"
                >
                  Answer (Record)
                </button>
                <textarea
                  placeholder="Or type your answer here"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
                <button
                  onClick={() => evaluateAnswer(userAnswer)}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition"
                >
                  Submit Answer
                </button>
              </>
            )}
          </div>

          {/* Last score */}
          {lastScore !== null && (
            <div className="bg-white p-4 rounded-lg shadow-md w-full max-w-md mt-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Last Score: <span className="text-blue-600">{lastScore}/10</span>
              </h3>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestionGenerator;
