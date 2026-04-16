const axios = require("axios");

// Generate AI question
const generateQuestion = async (req, res) => {
  try {
    const { subject } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    const prompt = `Generate one interview question for the subject: ${subject}`;
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    console.log(`Requesting question from Groq for subject: ${subject}`);

    const response = await axios.post(
      groqUrl,
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );

    console.log(`Groq API Status: ${response.status}`);
    const question = response.data?.choices?.[0]?.message?.content || "No question generated.";

    console.log("Generated Question:", question);

    res.status(200).json({
      success: true,
      question: question,
    });
  } catch (error) {
    console.error("Question generation error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate question",
      error: error.response?.data || error.message,
    });
  }
};

// Evaluate answer
const evaluateAnswer = async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    const prompt = `Evaluate the following answer for the given question on a scale of 0 to 10.

Question: ${question}
Answer: ${answer}

Only respond with a number from 0 to 10, no explanation. Give a score based on the relevance and correctness of the answer, and be lenient in evaluation.`;

    const groqApiKey = process.env.GROQ_API_KEY;
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const response = await axios.post(
      groqUrl,
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );

    const evaluation = response.data?.choices?.[0]?.message?.content || "0";

    // Extract number from response
    const score = evaluation.match(/\d+/)?.[0] || "0";

    res.status(200).json({
      success: true,
      evaluation: score,
    });
  } catch (error) {
    console.error("Answer evaluation error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate answer",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  generateQuestion,
  evaluateAnswer,
};
