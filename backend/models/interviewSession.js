const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema({

  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true
  },

  messages: [
    {
      role: String,
      content: String
    }
  ],

  totalScore: {
    type: Number,
    default: 0
  },

  questionCount: {
    type: Number,
    default: 0
  },
  finalSummary: {
    strengths: String,
    weaknesses: String,
    overallFeedback: String,
    recommendation: String,
    overallRating: Number
  }

 

}, { timestamps: true });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
