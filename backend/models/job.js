const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    requiredSkills: [
      {
        type: String,
      },
    ],

    techStack: [
      {
        type: String,
      },
    ],

    minExperienceYears: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
