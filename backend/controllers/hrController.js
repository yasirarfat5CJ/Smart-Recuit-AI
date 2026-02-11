const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");

const getAllCandidates = async (req, res) => {

  try {

    // Get all candidates
    const candidates = await Candidate.find();

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
const getDashboardStats = async (req, res) => {

  try {

    const totalCandidates = await Candidate.countDocuments();

    const candidates = await Candidate.find();

    const sessions = await InterviewSession.find();

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


module.exports = { getAllCandidates,getDashboardStats,getSingleCandidate };
