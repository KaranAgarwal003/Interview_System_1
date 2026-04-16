import React, { useState, useRef } from "react";
import { getApiUrl } from "../config/api.js";

const QuestionGenerator = () => {
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl("/generate-question", false), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Question data:", data);
      setCurrentQuestion(data.question || "No question generated.");
    } catch (error) {
      console.error("Fetch error:", error);
      setCurrentQuestion(`Error: Could not connect to API (${error.message})`);
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = async (answer) => {
    try {
      const response = await fetch(getApiUrl("/evaluate-answer", false), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, answer }),
      });

      const data = await response.json();
      console.log("Evaluation response:", data);

      if (!response.ok) {
        console.error("Evaluation failed:", data);
        setScore("Error");
        fetchQuestion();
        return;
      }

      const rawScore = data.evaluation;
      // Extract first number found (e.g. "7", "7/10", "Score: 7")
      const numericScore = String(rawScore).match(/\d+/)?.[0] ?? "0";
      console.log("Score set to:", numericScore);
      setScore(numericScore);
      fetchQuestion();
    } catch (err) {
      console.error("Evaluation error:", err);
      setScore("?");
      fetchQuestion();
    }
  };

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let timeout;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");

      setUserAnswer(transcript);

      if (event.results[0].isFinal) {
        clearTimeout(timeout);
        evaluateAnswer(transcript);
      } else {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          recognition.stop();
        }, 15000);
      }
    };

    recognition.onerror = (event) => {
      // 'aborted' fires normally when recognition stops — not a real error
      if (event.error !== "aborted" && event.error !== "no-speech") {
        alert("Speech recognition error: " + event.error);
      }
    };

    recognition.onend = () => {
      clearTimeout(timeout);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = () => {
    if (!subject.trim()) {
      alert("Please enter a subject.");
      return;
    }
    fetchQuestion();
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center font-sans">
      {/* <h1 className="text-3xl font-bold mb-6 text-gray-800">
        AI Question Generator
      </h1> */}

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <label className="block text-gray-700 font-semibold mb-2">
          Subject:
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleStart}
          disabled={loading}
          className={`w-full mt-4 px-4 py-2 text-white font-semibold rounded-lg shadow-md transition duration-300 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Generating..." : "Start"}
        </button>
      </div>

      {currentQuestion && (
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Question:
          </h2>
          <p className="text-gray-700 mb-4">{currentQuestion}</p>
          <button
            onClick={startRecording}
            className="w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
          >
            Answer (Record)
          </button>
          <textarea
            name="answer"
            id="ans"
            placeholder="Write your answer here"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows="4"
          ></textarea>
          <button
            onClick={() => evaluateAnswer(userAnswer)}
            className="w-full mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
          >
            Submit Answer
          </button>
          {userAnswer && (
            <p className="mt-4 text-gray-700">
              <strong>Your Answer:</strong> {userAnswer}
            </p>
          )}
        </div>
      )}

      {score !== null && (
        <div className="bg-white p-4 rounded-lg shadow-md w-full max-w-md mt-6">
          <h3 className="text-lg font-semibold text-gray-800">
            Last Answer Score: <span className="text-blue-600">{score}{typeof score === "number" || !isNaN(score) ? "/10" : ""}</span>
          </h3>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;
