const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    name: {
      type: String,
      default: ""
    },
    email: {
      type: String,
      default: ""
    },
    // Structured resume data — rawText is intentionally excluded to keep
    // documents small. ATS scoring uses it in-memory during upload only.
    parsedResume: {
      type: Object,
      required: true
    },
    atsScore: {
      type: Number,
      default: 0
    },
    atsBreakdown: {
      type: Object,
      default: {}
    },
    atsSuggestions: {
      type: [String],
      default: []
    },
    atsMode: {
      type: String,
      enum: ["normal", "jd"],
      default: "normal"
    },
    jobDescription: {
      type: String,
      default: ""
    },
    atsMatchDetails: {
      type: Object,
      default: {}
    },
    interviewStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

// "Candidate" (capital C) must match ref: "Candidate" in interviewSession.js
module.exports = mongoose.model("Candidate", candidateSchema);
