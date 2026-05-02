import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon, XCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { getApiUrl } from "../config/api";

const FLASK_BASE = import.meta.env.VITE_FLASK_API_URL || "http://localhost:5001";
const EXPRESS_BASE = import.meta.env.VITE_EXPRESS_API_URL || "http://localhost:5000/api";

export default function QuickAssessment() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({}); // { index: "A" }
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    setError("");
    setSelected({});
    setSubmitted(false);
    try {
      const res = await fetch(`${FLASK_BASE}/generate-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions || []);
    } catch (e) {
      setError("Failed to generate questions: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qi, letter) => {
    if (submitted) return;
    setSelected((prev) => ({ ...prev, [qi]: letter }));
  };

  const score = submitted
    ? questions.reduce((s, q, i) => s + (selected[i] === q.answer ? 1 : 0), 0)
    : 0;

  const handleSubmit = async () => {
    if (Object.keys(selected).length < questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setError("");
    setSubmitted(true);

    // Save session to Express
    const token = localStorage.getItem("token");
    if (!token) return;
    const finalScore = questions.reduce((s, q, i) => s + (selected[i] === q.answer ? 1 : 0), 0);
    const qa = questions.map((q, i) => ({
      question: q.question,
      answer: selected[i] || "",
      score: selected[i] === q.answer ? 10 : 0,
    }));
    setSaving(true);
    try {
      await fetch(`${EXPRESS_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, qa, duration: 0 }),
      });
    } catch (e) {
      console.error("Session save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const letterOf = (opt) => opt.trim().charAt(0).toUpperCase(); // "A. ..." → "A"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center space-x-3">
          <button onClick={() => navigate("/dashboard")} className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Quick Assessment (MCQ)</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Topic input */}
        {!questions.length && (
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g. React Hooks, Operating Systems, Python basics"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <button
              onClick={generate}
              disabled={loading || !subject.trim()}
              className="mt-4 w-full py-2 px-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition"
            >
              {loading ? "Generating 5 questions…" : "Generate Quiz"}
            </button>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <>
            {questions.map((q, qi) => (
              <div key={qi} className="bg-white rounded-lg shadow p-6">
                <p className="font-medium text-gray-900 mb-4">
                  <span className="text-green-600 font-bold mr-2">Q{qi + 1}.</span>
                  {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const letter = letterOf(opt);
                    const isSelected = selected[qi] === letter;
                    const isCorrect = q.answer === letter;
                    let cls =
                      "flex items-center w-full text-left px-4 py-2 rounded-lg border transition text-sm ";
                    if (!submitted) {
                      cls += isSelected
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-200 hover:border-green-300 hover:bg-green-50";
                    } else {
                      if (isCorrect) cls += "border-green-500 bg-green-50 text-green-800";
                      else if (isSelected && !isCorrect) cls += "border-red-400 bg-red-50 text-red-700";
                      else cls += "border-gray-200 text-gray-500";
                    }
                    return (
                      <button key={opt} className={cls} onClick={() => handleSelect(qi, letter)}>
                        {submitted && isCorrect && <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600 shrink-0" />}
                        {submitted && isSelected && !isCorrect && <XCircleIcon className="h-4 w-4 mr-2 text-red-500 shrink-0" />}
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {!submitted ? (
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
              >
                Submit Quiz
              </button>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {score} / {questions.length}
                </p>
                <p className="text-gray-500 mb-4">
                  {Math.round((score / questions.length) * 100)}% — {saving ? "saving…" : "session saved to dashboard"}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setQuestions([]); setSubject(""); setSubmitted(false); }}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                  >
                    New Quiz
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
