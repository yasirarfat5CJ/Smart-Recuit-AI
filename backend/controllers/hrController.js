const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");

const buildOwnerQuery = (user) => {
  const orConditions = [{ userId: user._id }];

  if (user.email) {
    const escapedEmail = String(user.email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    orConditions.push({
      email: { $regex: `^${escapedEmail}$`, $options: "i" }
    });
  }

  return { $or: orConditions };
};

const getAllCandidates = async (req, res) => {

  try {

    // Get all candidates
    const candidates = await Candidate.find({ isArchivedByHR: { $ne: true } });

    // Attach interview data
    const result = await Promise.all(

      candidates.map(async (candidate) => {

        const session = await InterviewSession
          .findOne({ candidateId: candidate._id })
          .sort({ createdAt: -1 });

        return {
           _id: candidate._id, 
          name: candidate.name,
          atsScore: candidate.atsScore,

          totalScore: session?.totalScore || 0,

          recommendation: session?.finalSummary?.recommendation || "N/A"

        };

      })

    );

    // Sort by ATS + interview score
    result.sort((a, b) => {

      const scoreA = a.atsScore + a.totalScore;
      const scoreB = b.atsScore + b.totalScore;

      return scoreB - scoreA;

    });

    res.json(result);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};

const getMyCandidateDashboard = async (req, res) => {

  try {

    const ownerQuery = buildOwnerQuery(req.user);
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
        _id: latestCandidate._id,
        name: latestCandidate.name,
        atsScore: latestCandidate.atsScore,
        parsedResume: latestCandidate.parsedResume,
        totalScore: session?.totalScore || 0,
        finalSummary: session?.finalSummary || null,
        interviewPending: !session?.finalSummary
      }
    });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};
const getDashboardStats = async (req, res) => {

  try {

    const activeCandidateQuery = { isArchivedByHR: { $ne: true } };
    const totalCandidates = await Candidate.countDocuments(activeCandidateQuery);

    const candidates = await Candidate.find(activeCandidateQuery);
    const candidateIds = candidates.map((c) => c._id);

    const sessions = candidateIds.length
      ? await InterviewSession.find({ candidateId: { $in: candidateIds } })
      : [];

    // Average ATS Score
    const avgATS =
      candidates.reduce((sum, c) => sum + (c.atsScore || 0), 0) /
      (candidates.length || 1);

    // Average Interview Score
    const avgInterview =
      sessions.reduce((sum, s) => sum + (s.totalScore || 0), 0) /
      (sessions.length || 1);

    // Hire Recommendations
    const hireCount = sessions.filter(
      s => s.finalSummary?.recommendation === "Hire"
    ).length;

    // Top Performer
    const topSession = sessions.sort(
      (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
    )[0];

    res.json({

      totalCandidates,

      averageATSScore: Math.round(avgATS),

      averageInterviewScore: Math.round(avgInterview),

      hireRecommendations: hireCount,

      topPerformer: topSession || null

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

      _id: candidate._id,

      name: candidate.name,

      atsScore: candidate.atsScore,

      parsedResume: candidate.parsedResume,

      totalScore: session?.totalScore || 0,

      finalSummary: session?.finalSummary || null

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

    res.json({
      message: "Candidate removed from HR ranking successfully"
    });

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
