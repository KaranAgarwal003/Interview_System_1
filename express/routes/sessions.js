const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const { protect } = require("../middleware/auth");

// POST /api/sessions — save a completed interview session
router.post("/", protect, async (req, res) => {
  try {
    const { subject, qa, duration } = req.body;
    if (!subject || !Array.isArray(qa) || qa.length === 0) {
      return res.status(400).json({ success: false, message: "subject and qa are required" });
    }

    const session = await Session.create({
      user: req.user._id,
      subject,
      qa,
      duration: duration || 0,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sessions — recent sessions for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(10)
      .select("subject averageScore date duration");

    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sessions/stats — aggregated stats for the dashboard
router.get("/stats", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({ user: userId }).select(
      "averageScore date"
    );

    const totalTests = sessions.length;
    const avgScore =
      totalTests > 0
        ? Math.round(
            (sessions.reduce((s, x) => s + x.averageScore, 0) / totalTests) * 10
          )
        : 0; // out of 100

    // Streak: count consecutive days (backwards from today) that have at least one session
    const todayStr = new Date().toDateString();
    const sessionDays = new Set(
      sessions.map((s) => new Date(s.date).toDateString())
    );

    let streak = 0;
    const cursor = new Date();
    // Allow today or yesterday to start a streak
    while (true) {
      if (sessionDays.has(cursor.toDateString())) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0 && cursor.toDateString() === todayStr) {
        // No session today yet — check yesterday
        cursor.setDate(cursor.getDate() - 1);
        if (!sessionDays.has(cursor.toDateString())) break;
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    // Rank thresholds (based on avg score out of 100)
    let rank = "Bronze";
    if (avgScore >= 85) rank = "Gold";
    else if (avgScore >= 65) rank = "Silver";

    res.json({ success: true, data: { totalTests, avgScore, streak, rank } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
