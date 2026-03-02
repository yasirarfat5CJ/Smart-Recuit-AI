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
    let fallbackUsed = false;
    let parsedJson;

    const fallbackParsedJson = {
      name: req.user?.name || "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
      techStack: [],
      experienceYears: 0
    };

    try {
      // Step 1 — AI structured parsing
      const structuredResume = await parseResume(filePath);

      console.log("RAW AI RESPONSE:\n", structuredResume);

      // Step 2 — Safe JSON parsing
      try {

        const cleanJsonString = structuredResume
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        parsedJson = JSON.parse(cleanJsonString);

      } catch (err) {

        console.log("Direct parse failed. Trying extraction...");

        const jsonMatch = String(structuredResume || "").match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error("No valid JSON found in AI response");
        }

        parsedJson = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log("Resume AI parse fallback used:", parseError.message);
      parsedJson = fallbackParsedJson;
      fallbackUsed = true;
    }

    if (!parsedJson || typeof parsedJson !== "object") {
      parsedJson = fallbackParsedJson;
      fallbackUsed = true;
    }

    if (!Array.isArray(parsedJson.skills)) parsedJson.skills = [];
    if (!Array.isArray(parsedJson.experience)) parsedJson.experience = [];
    if (!Array.isArray(parsedJson.projects)) parsedJson.projects = [];
    if (!Array.isArray(parsedJson.education)) parsedJson.education = [];
    if (!Array.isArray(parsedJson.techStack)) {
      parsedJson.techStack = Array.isArray(parsedJson.tech_stack) ? parsedJson.tech_stack : [];
    }

    // Step 3 — Calculate ATS score
    let atsScore = 0;
    try {
      atsScore = await calculateATSScore(parsedJson, job);
    } catch (scoreError) {
      console.log("ATS score fallback used:", scoreError.message);
    }

    // Step 4 — Save candidate
    const candidate = await Candidate.create({
      userId: req.user?._id || null,
      name: parsedJson.name || "",
      email: req.user?.email || parsedJson.email || "",
      parsedResume: parsedJson,
      atsScore
    });

    res.json({
      message: "Candidate saved successfully",
      candidate,
      fallbackUsed
    });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: error.message });

  }
};

module.exports = { uploadResume };
