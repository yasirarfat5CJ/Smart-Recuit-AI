const askAI = require("../config/aiClient");
const jwt = require("jsonwebtoken");
const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");
const User = require("../models/User");

module.exports = (io) => {
  const buildFallbackSummary = () => ({
    strengths: "Good effort during the interview.",
    weaknesses: "Could not generate a detailed AI summary.",
    overallFeedback: "Please retry the interview summary or review chat transcript manually.",
    recommendation: "No Hire",
    overallRating: 0
  });

  const buildFallbackQuestion = () =>
    "Tell me about one project you built recently and explain the technical decisions you made.";

  const buildFallbackEvaluation = () => ({
    feedback: "Thanks for your answer. Let’s continue to the next question.",
    nextQuestion: "Can you explain a challenging bug you fixed and how you debugged it?"
  });

  const parseJsonFromResponse = (raw) => {
    if (typeof raw !== "string" || !raw.trim()) {
      throw new Error("Empty AI response");
    }

    const cleanJson = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleanJson);
    } catch (fullParseError) {
      const matches = cleanJson.match(/\{[\s\S]*?\}/g) || [];

      for (const fragment of matches) {
        try {
          return JSON.parse(fragment);
        } catch (fragmentError) {
          // try next fragment
        }
      }

      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw fullParseError;
    }
  };

  const normalizeRecommendation = (value) => {
    const text = String(value || "").toLowerCase().trim();
    if (text === "hire") return "Hire";
    if (text === "no hire" || text === "nohire" || text === "reject") return "No Hire";
    return "N/A";
  };

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
      const user = await User.findById(decoded.id).select("role email");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: decoded.id,
        role: user.role,
        email: user.email
      };
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    let messages = [];
    let sessionId = null;

    // ⭐ Prevent repeated questions
    let askedQuestions = new Set();

    socket.on("startInterview", async ({ candidateId }) => {

      try {
        if (socket.user?.role !== "candidate") {
          return socket.emit("error", "Only candidates can start interviews");
        }

        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
          return socket.emit("error", "Candidate not found");
        }

        const ownsByUserId =
          candidate.userId && String(candidate.userId) === String(socket.user.id);
        const ownsByEmail =
          candidate.email &&
          socket.user.email &&
          String(candidate.email).toLowerCase() === String(socket.user.email).toLowerCase();

        if (!ownsByUserId && !ownsByEmail) {
          return socket.emit("error", "Access denied");
        }

        const session = await InterviewSession.create({
          candidateId,
          messages: []
        });

        sessionId = session._id;

        // ⭐ Senior-level interviewer personality
        messages = [
          {
            role: "system",
            content: `
You are a SENIOR technical interviewer.

INTERVIEW STYLE:

- Think like experienced FAANG interviewer.
- Humans rarely give perfect answers — accept partial understanding.
- Evaluate conceptual clarity instead of exact wording.
- Encourage candidate when answer is related or logically correct.
- Ask ONE question at a time.
- Increase difficulty gradually.
- Ask follow-up questions based on candidate responses.
- NEVER repeat any previously asked question.
- Maintain natural conversational interview flow.

Candidate skills:
${JSON.stringify(candidate.parsedResume.skills)}
`
          }
        ];

        let firstQuestion = buildFallbackQuestion();

        try {
          const aiFirstQuestion = await askAI(messages);
          if (typeof aiFirstQuestion === "string" && aiFirstQuestion.trim()) {
            firstQuestion = aiFirstQuestion.trim();
          }
        } catch (aiError) {
          console.log("Start Interview AI fallback used:", aiError.message);
        }

        askedQuestions.add(firstQuestion);

        messages.push({
          role: "assistant",
          content: firstQuestion
        });

        socket.emit("aiQuestion", firstQuestion);

      } catch (err) {

        console.log("Start Interview Error:", err);
        socket.emit("error", "Interview start failed");

      }

    });

    socket.on("candidateAnswer", async ({ answer }) => {

      try {

        if (!sessionId) {
          return socket.emit("error", "Session not initialized");
        }

        messages.push({
          role: "user",
          content: answer
        });

        // ⭐ Senior evaluation prompt
        const evaluationPrompt = [
          ...messages,
          {
            role: "system",
            content: `
You are a senior technical interviewer.

TASK:

- Understand candidate answer from HUMAN perspective.
- Accept related or partially correct answers.
- Give constructive and supportive feedback.
- Focus on reasoning, not perfection.

IMPORTANT:

- DO NOT repeat any previously asked question.
- Generate a NEW relevant technical question.
- Adapt difficulty based on conversation.

Return ONLY valid JSON:

{
  "feedback": "human-like supportive feedback",
  "nextQuestion": "new technical question"
}
`
          }
        ];

        let evaluation = buildFallbackEvaluation();

        try {
          const aiResponse = await askAI(evaluationPrompt);
          console.log("AI RAW RESPONSE:", aiResponse);
          const parsedEvaluation = parseJsonFromResponse(aiResponse);

          evaluation = {
            feedback: parsedEvaluation.feedback || evaluation.feedback,
            nextQuestion: parsedEvaluation.nextQuestion || evaluation.nextQuestion
          };
        } catch (aiError) {
          console.log("Evaluation AI fallback used:", aiError.message);
        }

        // ⭐ Prevent repeated questions (backend safety)
        if (askedQuestions.has(evaluation.nextQuestion)) {

          evaluation.nextQuestion =
            "Let's explore deeper: explain an advanced concept related to your previous answer.";

        }

        askedQuestions.add(evaluation.nextQuestion);

        messages.push({
          role: "assistant",
          content: evaluation.nextQuestion
        });

        await InterviewSession.findByIdAndUpdate(sessionId, {
          messages
        });

        socket.emit("aiEvaluation", evaluation);

      } catch (err) {

        console.log("Evaluation Error:", err);
        socket.emit("error", "AI evaluation failed");

      }

    });

    socket.on("endInterview", async () => {

      try {

        if (!sessionId) {
          return socket.emit("error", "Session not found");
        }

        const summaryPrompt = [

          ...messages,

          {
            role: "system",
            content: `
You are a senior technical interviewer.

Analyze the full interview conversation.

Return ONLY valid JSON:

{
  "strengths": "candidate strengths",
  "weaknesses": "areas of improvement",
  "overallFeedback": "professional final evaluation",
  "recommendation": "Hire or No Hire",
  "overallRating": 0
}
`
          }

        ];

        let finalSummary = buildFallbackSummary();

        try {
          let parsedSummary;

          try {
            const aiResponse = await askAI(summaryPrompt);
            parsedSummary = parseJsonFromResponse(aiResponse);
          } catch (primarySummaryError) {
            console.log("Primary summary failed, retrying compact prompt:", primarySummaryError.message);

            const compactPrompt = `
You are a senior technical interviewer.
Return ONLY valid JSON with exactly these keys:
{
  "strengths": "",
  "weaknesses": "",
  "overallFeedback": "",
  "recommendation": "Hire or No Hire",
  "overallRating": 0
}

Interview transcript:
${messages.slice(-12).map((m) => `${m.role}: ${m.content}`).join("\n")}
`;

            const retryResponse = await askAI(compactPrompt);
            parsedSummary = parseJsonFromResponse(retryResponse);
          }

          const rating = Number(parsedSummary.overallRating);
          const normalizedRecommendation = normalizeRecommendation(parsedSummary.recommendation);
          const normalizedRating = Number.isFinite(rating) ? Math.max(0, Math.min(10, rating)) : 0;
          const totalScore = Math.round(normalizedRating * 10);
          const questionCount = messages.filter((m) => m.role === "assistant").length;

          finalSummary = {
            strengths: parsedSummary.strengths || finalSummary.strengths,
            weaknesses: parsedSummary.weaknesses || finalSummary.weaknesses,
            overallFeedback: parsedSummary.overallFeedback || finalSummary.overallFeedback,
            recommendation: normalizedRecommendation,
            overallRating: normalizedRating
          };

          await InterviewSession.findByIdAndUpdate(sessionId, {
            finalSummary,
            totalScore,
            questionCount
          });

          return socket.emit("finalSummary", finalSummary);
        } catch (summaryErr) {
          console.log("Summary Parse Error:", summaryErr.message);
        }

        await InterviewSession.findByIdAndUpdate(sessionId, {
          finalSummary
        });

        socket.emit("finalSummary", finalSummary);

      } catch (err) {

        console.log("Summary Error:", err);
        socket.emit("error", "Final summary generation failed");

      }

    });

    socket.on("disconnect", () => {

      console.log("User disconnected:", socket.id);

    });

  });

};
