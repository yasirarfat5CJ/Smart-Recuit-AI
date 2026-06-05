const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");

const buildOwnerQuery = (user) => {
  const conditions = [{ userId: user._id }];

  if (user.email) {
    const escapedEmail = String(user.email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({ email: { $regex: `^${escapedEmail}$`, $options: "i" } });
  }

  return { $or: conditions };
};

const ownsCandidate = (candidate, user) => {
  const ownsById = candidate.userId && String(candidate.userId) === String(user._id);
  const ownsByEmail = candidate.email && user.email &&
    candidate.email.toLowerCase() === user.email.toLowerCase();

  return ownsById || ownsByEmail;
};

const sessionSummary = (session) => ({
  _id: session._id,
  interviewType: session.interviewType || "technical",
  totalScore: session.totalScore || 0,
  questionCount: session.questionCount || 0,
  finalSummary: session.finalSummary || null,
  status: session.status,
  createdAt: session.createdAt
});

const getDashboard = async (req, res) => {
  try {
    const resumes = await Candidate.find(buildOwnerQuery(req.user))
      .sort({ createdAt: -1 })
      .lean();

    if (!resumes.length) {
      return res.json({ uploadCount: 0, latestResume: null, interviewHistory: [] });
    }

    const latestResume = resumes[0];
    const sessions = await InterviewSession.find({
      candidateId: { $in: resumes.map((resume) => resume._id) }
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    return res.json({
      uploadCount: resumes.length,
      latestResume,
      interviewHistory: sessions.map(sessionSummary)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getResume = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).lean();

    if (!candidate) {
      return res.status(404).json({ message: "Resume not found" });
    }

    if (!ownsCandidate(candidate, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const sessions = await InterviewSession.find({ candidateId: candidate._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ...candidate,
      interviewHistory: sessions.map(sessionSummary)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboard, getResume };
