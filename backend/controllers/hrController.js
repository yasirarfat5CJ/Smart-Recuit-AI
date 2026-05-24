const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");

const HIRE_SCORE_THRESHOLD = 70;

const recommendationFromScore = (score) =>
  Number(score) >= HIRE_SCORE_THRESHOLD ? "Hire" : "No Hire";

/**
 * FIX: The original code called Number.isFinite(Number(session.totalScore)),
 * which is true for 0 (the default). This caused every candidate who hadn't
 * done their interview yet to show "No Hire" instead of "N/A".
 *
 * Now we only derive a recommendation when the interview is actually complete
 * (finalSummary exists and totalScore > 0).
 */
const resolveRecommendation = (session) => {
  if (!session) return "N/A";

  // Interview completed and scored
  if (session.finalSummary && session.totalScore > 0) {
    return recommendationFromScore(session.totalScore);
  }

  // Completed but use the AI recommendation directly if score is missing
  if (session.finalSummary?.recommendation) {
    return session.finalSummary.recommendation;
  }

  return "N/A"; // interview pending or abandoned
};

const normalizeFinalSummary = (session) => {
  if (!session?.finalSummary) return null;

  const rawSummary =
    typeof session.finalSummary.toObject === "function"
      ? session.finalSummary.toObject()
      : session.finalSummary;

  return {
    ...rawSummary,
    recommendation: resolveRecommendation(session)
  };
};

const buildOwnerQuery = (user) => {
  const orConditions = [{ userId: user._id }];

  if (user.email) {
    const escaped = String(user.email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orConditions.push({ email: { $regex: `^${escaped}$`, $options: "i" } });
  }

  return { $or: orConditions };
};

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({ isArchivedByHR: { $ne: true } });

    const result = await Promise.all(
      candidates.map(async (candidate) => {
        const session = await InterviewSession
          .findOne({ candidateId: candidate._id })
          .sort({ createdAt: -1 });

        return {
          _id:            candidate._id,
          name:           candidate.name,
          atsScore:       candidate.atsScore,
          totalScore:     session?.totalScore || 0,
          recommendation: resolveRecommendation(session)
        };
      })
    );

    result.sort((a, b) => (b.atsScore + b.totalScore) - (a.atsScore + a.totalScore));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyCandidateDashboard = async (req, res) => {
  try {
    const ownerQuery  = buildOwnerQuery(req.user);
    const uploadCount = await Candidate.countDocuments(ownerQuery);

    if (uploadCount === 0) {
      return res.status(404).json({ message: "No resumes uploaded yet" });
    }

    const latestCandidate = await Candidate.findOne(ownerQuery).sort({ createdAt: -1 });

    if (!latestCandidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const session = await InterviewSession
      .findOne({ candidateId: latestCandidate._id })
      .sort({ createdAt: -1 });

    res.json({
      uploadCount,
      latestCandidate: {
        _id:              latestCandidate._id,
        name:             latestCandidate.name,
        atsScore:         latestCandidate.atsScore,
        parsedResume:     latestCandidate.parsedResume,
        totalScore:       session?.totalScore || 0,
        finalSummary:     normalizeFinalSummary(session),
        interviewPending: !session?.finalSummary
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const activeQuery     = { isArchivedByHR: { $ne: true } };
    const totalCandidates = await Candidate.countDocuments(activeQuery);
    const candidates      = await Candidate.find(activeQuery);
    const candidateIds    = candidates.map((c) => c._id);

    const sessions = candidateIds.length
      ? await InterviewSession.find({ candidateId: { $in: candidateIds } })
      : [];

    const avgATS = candidates.reduce((s, c) => s + (c.atsScore || 0), 0) / (candidates.length || 1);
    const avgInterview = sessions.reduce((s, sess) => s + (sess.totalScore || 0), 0) / (sessions.length || 1);

    const hireCount = sessions.filter((s) => resolveRecommendation(s) === "Hire").length;

    const topSession = [...sessions].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))[0];

    res.json({
      totalCandidates,
      averageATSScore:      Math.round(avgATS),
      averageInterviewScore: Math.round(avgInterview),
      hireRecommendations:  hireCount,
      topPerformer:         topSession || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSingleCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (candidate.isArchivedByHR && req.user?.role !== "candidate") {
      return res.status(404).json({ message: "Candidate not found" });
    }

    if (req.user?.role === "candidate") {
      const ownsByUserId =
        candidate.userId && String(candidate.userId) === String(req.user._id);
      const ownsByEmail =
        candidate.email &&
        req.user.email &&
        String(candidate.email).toLowerCase() === String(req.user.email).toLowerCase();

      if (!ownsByUserId && !ownsByEmail) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const session = await InterviewSession
      .findOne({ candidateId: req.params.id })
      .sort({ createdAt: -1 });

    res.json({
      _id:          candidate._id,
      name:         candidate.name,
      atsScore:     candidate.atsScore,
      parsedResume: candidate.parsedResume,
      totalScore:   session?.totalScore || 0,
      finalSummary: normalizeFinalSummary(session)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await Candidate.findByIdAndUpdate(req.params.id, {
      isArchivedByHR: true,
      archivedAt: new Date()
    });

    res.json({ message: "Candidate removed from HR ranking successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCandidates,
  getDashboardStats,
  getMyCandidateDashboard,
  getSingleCandidate,
  deleteCandidate
};