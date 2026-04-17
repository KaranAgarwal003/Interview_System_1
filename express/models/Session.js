const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: "" },
  score: { type: Number, min: 0, max: 10, default: 0 },
});

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    qa: [qaSchema],
    averageScore: { type: Number, min: 0, max: 10, default: 0 },
    duration: { type: Number, default: 0 }, // seconds
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Compute averageScore before saving
sessionSchema.pre("save", function (next) {
  const scored = this.qa.filter((q) => q.score != null);
  this.averageScore =
    scored.length > 0
      ? scored.reduce((sum, q) => sum + q.score, 0) / scored.length
      : 0;
  next();
});

module.exports = mongoose.model("Session", sessionSchema);
