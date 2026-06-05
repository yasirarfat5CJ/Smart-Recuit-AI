const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",   // must match mongoose.model("Candidate", ...) exactly
      required: true
    },
    interviewType: {
      type: String,
      enum: ["project", "technical", "hr"],
      default: "technical"
    },

    messages: [
      {
        role: {
          type: String,
          enum: ["system", "user", "assistant"],
          required: true
        },
        content: {
          type: String,
          required: true
        }
      }
    ],

    // Persisted so question deduplication survives socket reconnects.
    // Without this field the askedQuestions array resets on every reconnect
    // and the AI repeats questions it already asked.
    askedQuestions: {
      type: [String],
      default: []
    },

    // Tracks which interview stage we're on so a reconnecting socket can
    // resume from the correct point.
    currentStage: {
      type: String,
      enum: [
        "technical_foundation",
        "core_subjects",
        "dsa_problem_solving",
        "project_deep_dive",
        "project_follow_up"
      ],
      default: "technical_foundation"
    },

    // Raw turn counter — used to derive currentStage on reconnect.
    interviewTurn: {
      type: Number,
      default: 0
    },

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
      readinessLevel: {
        type: String,
        enum: ["Needs Practice", "Developing", "Interview Ready"]
      },
      overallRating: Number
    },

    // Lets the frontend and HR dashboard know whether the session is live,
    // done, or was abandoned mid-way.
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
