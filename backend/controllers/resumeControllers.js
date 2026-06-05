const parseResume = require("../services/parseResume");
const Candidate = require("../models/Candidate");
const calculateATSScore = require("../services/atsScoringService");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shape returned when AI parsing completely fails. */
const buildFallbackResume = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: "",
  summary: "",
  skills: [],
  techStack: [],
  experience: [],
  experienceYears: 0,
  projects: [],
  education: []
  // Note: no rawText — ATS scorer handles undefined gracefully
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const uploadResume = async (req, res) => {
  try {
    // ── Validate inputs ────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ── Step 1: Parse resume ───────────────────────────────────────────────
    // parseResume returns a plain JS object — no JSON string, no double-parse.
    // The object includes `rawText` for ATS scoring (in-memory only).
    let parsedResume;
    let fallbackUsed = false;

    try {
      parsedResume = await parseResume(req.file.path);
    } catch (parseError) {
      console.warn("[uploadResume] Resume parsing failed, using fallback:", parseError.message);
      parsedResume = buildFallbackResume(req.user);
      fallbackUsed = true;
    }

    if (!parsedResume || typeof parsedResume !== "object") {
      parsedResume = buildFallbackResume(req.user);
      fallbackUsed = true;
    }

    // Fill in user identity if AI missed it
    if (!parsedResume.name && req.user?.name) parsedResume.name = req.user.name;
    if (!parsedResume.email && req.user?.email) parsedResume.email = req.user.email;

    // ── Step 2: Calculate ATS score ────────────────────────────────────────
    // rawText is still on parsedResume here — atsScoringService uses it for
    // full-text skill matching. We strip it before DB save below.
    let atsResult = { score: 0, breakdown: {}, suggestions: [] };
    try {
      atsResult = calculateATSScore(parsedResume);
    } catch (scoreError) {
      console.warn("[uploadResume] ATS scoring failed, defaulting to 0:", scoreError.message);
    }

    // ── Step 3: Strip rawText before persisting ────────────────────────────
    // rawText can be thousands of characters — storing it in MongoDB bloats
    // every document and risks hitting the 16 MB document size limit.
    delete parsedResume.rawText;

    // ── Step 4: Save candidate ─────────────────────────────────────────────
    const candidate = await Candidate.create({
      userId: req.user?._id || null,
      name: parsedResume.name || "",
      email: parsedResume.email || req.user?.email || "",
      parsedResume,
      atsScore: atsResult.score,
      atsBreakdown: atsResult.breakdown,
      atsSuggestions: atsResult.suggestions
    });

    return res.json({
      message: "Candidate saved successfully",
      candidate,
      fallbackUsed,
      atsBreakdown: atsResult.breakdown,
      atsSuggestions: atsResult.suggestions
    });

  } catch (error) {
    console.error("[uploadResume] Unexpected error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  } finally {
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
};

module.exports = { uploadResume };
