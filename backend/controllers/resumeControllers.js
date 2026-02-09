const parseResume = require("../services/parseResume");
const Candidate = require("../models/Candidate");
const Job = require("../models/job");
const calculateATSScore = require("../services/atsScoringService");

const uploadResume = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "Job ID required" });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const filePath = req.file.path;

    // Step 1 — AI structured parsing
    const structuredResume = await parseResume(filePath);

    console.log("RAW AI RESPONSE:\n", structuredResume);

    let parsedJson;

    // Step 2 — Safe JSON parsing
    try {

      const cleanJsonString = structuredResume
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      parsedJson = JSON.parse(cleanJsonString);

    } catch (err) {

      console.log("Direct parse failed. Trying extraction...");

      const jsonMatch = structuredResume.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      parsedJson = JSON.parse(jsonMatch[0]);
    }

    // Step 3 — Calculate ATS score
    const atsScore =await calculateATSScore(parsedJson, job);

    // Step 4 — Save candidate
    const candidate = await Candidate.create({
      name: parsedJson.name || "",
      parsedResume: parsedJson,
      atsScore
    });

    res.json({
      message: "Candidate saved successfully",
      candidate
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: error.message });

  }
};

module.exports = { uploadResume };
