import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";

const FLASK_BASE = import.meta.env.VITE_FLASK_API_URL || "http://localhost:5001";
const EXPRESS_BASE = import.meta.env.VITE_EXPRESS_API_URL || "http://localhost:5000/api";

export default function WrittenEvaluation() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // { score, feedback }
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingE, setLoadingE] = useState(false);
  const [error, setError] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);

  const generateQuestion = async () => {
    if (!topic.trim()) return;
    setLoadingQ(true);
    setError("");
    setResult(null);
    setAnswer("");
    try {
      const res = await fetch(`${FLASK_BASE}/generate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestion(data.question || "");
    } catch (e) {
      setError("Failed to generate question: " + e.message);
    } finally {
      setLoadingQ(false);
    }
  };

  const evaluate = async () => {
    if (!question.trim() || !answer.trim()) {
      setError("Please enter both a question and an answer.");
      return;
    }
    setLoadingE(true);
    setError("");
    setResult(null);
    try {
      // Score
      const scoreRes = await fetch(`${FLASK_BASE}/evaluate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);
      const numericScore = parseInt(String(scoreData.evaluation).match(/\d+/)?.[0] ?? "0", 10);

      // Feedback — ask Groq for a brief explanation
      const feedbackRes = await fetch(`${FLASK_BASE}/evaluate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer: answer + "\n\nPlease give 1-2 sentences of constructive feedback on this answer.",
        }),
      });
      const feedbackData = await feedbackRes.json();
      // feedbackData.evaluation will be text here since we appended a feedback request
      const feedback = isNaN(feedbackData.evaluation)
        ? feedbackData.evaluation
        : "Good effort! Keep practicing to improve your answers.";

      setResult({ score: numericScore, feedback });

      // Save session
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${EXPRESS_BASE}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            subject: topic || "Written Evaluation",
            qa: [{ question, answer, score: numericScore }],
            duration: 0,
          }),
        });
        setSessionSaved(true);
      }
    } catch (e) {
      setError("Evaluation failed: " + e.message);
    } finally {
      setLoadingE(false);
    }
  };

  const reset = () => {
    setQuestion("");
    setAnswer("");
    setResult(null);
    setError("");
    setSessionSaved(false);
  };

  const scoreColor = (s) => {
    if (s >= 8) return "text-green-600";
    if (s >= 5) return "text-yellow-600";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center space-x-3">
          <button onClick={() => navigate("/dashboard")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Written Evaluation</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Topic + question generator */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Database normalization, React lifecycle"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={generateQuestion}
                disabled={loadingQ || !topic.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
              >
                <SparklesIcon className="h-4 w-4" />
                {loadingQ ? "…" : "Generate"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type or generate a question above"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Answer */}
        {question && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">Your Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer here…"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!result && (
              <button
                onClick={evaluate}
                disabled={loadingE || !answer.trim()}
                className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition"
              >
                {loadingE ? "Evaluating…" : "Submit for Evaluation"}
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Result</h2>
              <span className={`text-3xl font-bold ${scoreColor(result.score)}`}>
                {result.score}<span className="text-base font-normal text-gray-400">/10</span>
              </span>
            </div>

            {/* Score bar */}
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  result.score >= 8 ? "bg-green-500" : result.score >= 5 ? "bg-yellow-400" : "bg-red-400"
                }`}
                style={{ width: `${result.score * 10}%` }}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-medium text-gray-800 mb-1">Feedback</p>
              <p>{result.feedback}</p>
            </div>

            {sessionSaved && (
              <p className="text-xs text-green-600">Session saved to your dashboard.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition"
              >
                Try Another
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
