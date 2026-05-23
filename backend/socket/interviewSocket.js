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

  const sanitizeQuestionText = (text) =>
    String(text || "")
      .replace(/^[-*\s"'`]+/, "")
      .replace(/[-*\s"'`]+$/, "")
      .replace(/\s+/g, " ")
      .trim();

  const detectAnswerTopic = (answer = "", resumeContext = {}) => {
    const text = String(answer || "").toLowerCase();

    if (/^\s*(sorry|soory|sorryy|sry|apolog(y|ize)|my bad)\b/i.test(text)) {
      return null;
    }

    const topics = [
      ["api", ["api", "endpoint", "request", "response", "backend", "rest"]],
      ["frontend", ["frontend", "ui", "react", "component", "state", "browser"]],
      ["database", ["database", "mongodb", "schema", "query", "collection", "index"]],
      ["authentication", ["auth", "jwt", "login", "token", "session", "password"]],
      ["deployment", ["deploy", "deployment", "render", "netlify", "vercel", "docker"]],
      ["debugging", ["bug", "debug", "error", "fix", "issue", "troubleshoot"]],
      ["performance", ["performance", "optimize", "scalable", "latency", "speed"]],
      ["testing", ["test", "testing", "jest", "unit", "integration"]],
      ["ai", ["ai", "llm", "prompt", "groq", "model", "inference"]],
      ["project", ["project", "portfolio", "feature", "system", "workflow"]]
    ];

    for (const [topic, keywords] of topics) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return topic;
      }
    }

    const resumeHints = [
      ...(Array.isArray(resumeContext.skills) ? resumeContext.skills : []),
      ...(Array.isArray(resumeContext.techStack) ? resumeContext.techStack : [])
    ]
      .flat()
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return resumeHints[0] || null;
  };

  const buildAnswerAwareFallback = (stage, resumeContext = {}, answer = "", previousQuestion = "") => {
    const topic = detectAnswerTopic(answer, resumeContext);
    const project = getPrimaryProject(resumeContext);
    const questionAnchor = sanitizeQuestionText(previousQuestion || buildFallbackQuestion());

    if (/\b(sorry|don't know|not sure|skip)\b/i.test(String(answer || ""))) {
      return `No problem. Let's stay with the same question for one more attempt: "${questionAnchor}" Please give one concrete example and explain why it works.`;
    }

    const followUps = {
      technical_foundation: `Can you explain a practical example of ${topic} from your work or projects, and why the approach mattered?`,
      core_subjects: `How would you apply ${topic} in a real system, and what tradeoff would you consider?`,
      dsa_problem_solving: `If you had to solve a problem around ${topic}, how would you approach it step by step and what is the time complexity?`,
      project_deep_dive: `In ${project}, where did ${topic} matter most, and what decision did you make there?`,
      project_follow_up: `Based on your last answer about ${topic}, what would you improve, scale, or debug next?`
    };

    if (!topic) {
      return `Let's go one step deeper into "${questionAnchor}". What would you do next?`;
    }

    return followUps[stage] || `Let's go one step deeper into ${topic}. What would you do next?`;
  };

  const buildInterviewQuestionPrompt = ({ stage, resumeContext = {}, answer = "", previousQuestion = "", askedQuestions = [] }) => `
You are a senior technical interviewer conducting a real-time interview.

Rules:
- Ask exactly ONE next question.
- The question must directly build on the candidate's latest answer.
- Do not reuse or paraphrase any previous question.
- Avoid fixed templates and avoid mentioning "shall" unless the candidate brought up documentation wording.
- Keep the question natural, specific, and based on the answer plus resume context.
- Prefer a follow-up that checks understanding, tradeoffs, examples, edge cases, or debugging.
- Do not give feedback in the question.

Current stage: ${stage}
Previous question: ${previousQuestion}
Candidate answer: ${answer}
Resume context: ${JSON.stringify(resumeContext)}
Already asked questions: ${JSON.stringify(askedQuestions)}

Return only the question text.
`;

  const generateInterviewQuestion = async ({ stage, resumeContext = {}, answer = "", previousQuestion = "", askedQuestions = [] }) => {
    try {
      const response = await askAI(buildInterviewQuestionPrompt({ stage, resumeContext, answer, previousQuestion, askedQuestions }));
      const question = sanitizeQuestionText(response);

      if (question && !hasSimilarQuestion(question, askedQuestions)) {
        return question;
      }
    } catch (error) {
      console.log("Interview question generation fallback used:", error.message);
    }

    return sanitizeQuestionText(buildAnswerAwareFallback(stage, resumeContext, answer, previousQuestion));
  };

  const getPrimaryProject = (resumeContext = {}) => {
    const [project] = resumeContext.projects || [];
    if (!project) return "one of your projects";
    return project.title || project.name || String(project);
  };

  const getPrimarySkill = (resumeContext = {}) => {
    const skills = [
      ...(Array.isArray(resumeContext.skills) ? resumeContext.skills : []),
      ...(Array.isArray(resumeContext.techStack) ? resumeContext.techStack : [])
    ].flat();

    return skills.find(Boolean) || "your main technical stack";
  };

  const getInterviewStage = (turn) => {
    if (turn === 0) return "technical_foundation";
    if (turn === 1) return "dsa_problem_solving";
    if (turn === 2) return "project_deep_dive";
    return "project_follow_up";
  };

  const getStageTurn = (stage) => {
    if (stage === "technical_foundation" || stage === "core_subjects") return 0;
    if (stage === "dsa_problem_solving") return 1;
    if (stage === "project_deep_dive") return 2;
    return 3;
  };

  const detectRequestedStage = (lower) => {
    if (/\b(project|projects|portfolio|resume project)\b/.test(lower)) {
      return "project_deep_dive";
    }

    if (/\b(dsa|data structure|algorithm|coding problem|coding round)\b/.test(lower)) {
      return "dsa_problem_solving";
    }

    if (/\b(core subject|core subjects|oop|oops|dbms|database|os|operating system|computer network|networks|cn)\b/.test(lower)) {
      return "core_subjects";
    }

    if (/\b(technical|basics|fundamental|foundation)\b/.test(lower)) {
      return "technical_foundation";
    }

    return null;
  };

  const analyzeAnswer = (answer) => {
    const text = String(answer || "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const lower = text.toLowerCase();
    const requestedStage = detectRequestedStage(lower);

    return {
      wordCount: words.length,
      requestedStage,
      isTopicSwitch: Boolean(requestedStage),
      asksForDsa: requestedStage === "dsa_problem_solving",
      incomplete: !requestedStage && (words.length < 18 || /(\{$|,$|-$|example\s*$)/i.test(text))
    };
  };

  const buildSameTopicFollowUp = (previousQuestion, answer) => {
    const question = sanitizeQuestionText(previousQuestion || buildFallbackQuestion());
    const lower = String(answer || "").toLowerCase();

    if (/\b(sorry|don'?t know|not sure|skip)\b/.test(lower)) {
      return `No problem. Let's stay with the same question for one more attempt: "${question}" Please give one concrete example and explain why it works.`;
    }

    return `You’re on the right track, but I need one concrete example and one edge case or tradeoff for "${question}" before we move on.`;
  };

  const buildStageQuestion = (stage, resumeContext = {}, answer = "", askedQuestions = [], previousQuestion = "") =>
    sanitizeQuestionText(buildAnswerAwareFallback(stage, resumeContext, answer, previousQuestion || askedQuestions.at(-1) || ""));

  const buildFallbackEvaluation = (answer, previousQuestion, stage, resumeContext, askedQuestions) => {
    const answerState = analyzeAnswer(answer);
    const topic = detectAnswerTopic(answer, resumeContext);

    if (answerState.isTopicSwitch) {
      return {
        feedback: "Sure, we can switch topics.",
        nextQuestion: buildStageQuestion(answerState.requestedStage, resumeContext, answer, askedQuestions, previousQuestion),
        shouldAdvance: true,
        answerQuality: "topic_switch"
      };
    }

    if (answerState.incomplete) {
      return {
        feedback: topic
          ? `You’ve started answering about ${topic}, but it needs one concrete example and a bit more detail.`
          : `You’ve started answering, but it needs one concrete example and a bit more detail.`,
        nextQuestion: buildSameTopicFollowUp(previousQuestion, answer),
        shouldAdvance: false,
        answerQuality: "incomplete"
      };
    }

    const feedback = topic
      ? `Good — I can follow your reasoning on ${topic}.`
      : "Good — I can follow your reasoning so far.";

    return {
      feedback,
      nextQuestion: buildStageQuestion(stage, resumeContext, answer, askedQuestions, previousQuestion),
      shouldAdvance: true,
      answerQuality: "acceptable"
    };
  };

  const normalizeQuestion = (question) =>
    String(question || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(can|could|please|tell|me|about|explain|describe|what|why|how|the|a|an|your|you)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const questionSimilarity = (first, second) => {
    const firstTokens = new Set(normalizeQuestion(first).split(" ").filter(Boolean));
    const secondTokens = new Set(normalizeQuestion(second).split(" ").filter(Boolean));

    if (!firstTokens.size || !secondTokens.size) return 0;

    const overlap = [...firstTokens].filter((token) => secondTokens.has(token)).length;
    return overlap / Math.max(firstTokens.size, secondTokens.size);
  };

  const hasSimilarQuestion = (question, askedQuestions) =>
    askedQuestions.some((askedQuestion) =>
      normalizeQuestion(question) === normalizeQuestion(askedQuestion) ||
      questionSimilarity(question, askedQuestion) >= 0.72
    );

  const buildContextualFallbackQuestion = (answer, askedQuestions) => {
    const templates = [
      `Based on your last answer, what tradeoff did you consider and why did you choose that approach?`,
      `What was the hardest technical problem in that work, and how did you debug it step by step?`,
      `How would you scale or improve that solution if the number of users increased significantly?`,
      `Which part of that implementation would you refactor first, and what would you change?`,
      `How did you validate that your solution was correct and reliable?`
    ];

    return templates.find((question) => !hasSimilarQuestion(question, askedQuestions)) ||
      `Let's go deeper into your previous answer: what specific technical decision had the biggest impact?`;
  };

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

  const normalizeRating = (value) => {
    const rating = Number(value);
    if (!Number.isFinite(rating)) return 0;
    if (rating > 10 && rating <= 100) return Math.max(0, Math.min(10, rating / 10));
    return Math.max(0, Math.min(10, rating));
  };

  const recommendationFromRating = (rating) => (rating >= 7 ? "Hire" : "No Hire");

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
	    let interviewTurn = 0;
	    let resumeContext = {};

	    // ⭐ Prevent repeated questions
	    let askedQuestions = [];

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

	        resumeContext = {
	          skills: candidate.parsedResume?.skills || [],
	          techStack: candidate.parsedResume?.techStack || candidate.parsedResume?.tech_stack || [],
	          projects: candidate.parsedResume?.projects || [],
	          experience: candidate.parsedResume?.experience || [],
	          education: candidate.parsedResume?.education || []
	        };

	        // ⭐ Senior-level interviewer personality
	        messages = [
	          {
	            role: "system",
	            content: `
  You are a senior technical interviewer having a natural one-on-one conversation.

  INTERVIEW STYLE:

  - Be warm, focused, and adaptive.
  - Ask exactly one question at a time.
  - Base every next question on the candidate's latest answer and the immediate prior question.
  - Do not follow a scripted curriculum or fixed sequence.
  - If the answer is incomplete, ask a short clarifying follow-up on the same idea.
  - If the answer is strong, go a little deeper with a practical follow-up, edge case, or tradeoff.
  - Only change topic when the candidate clearly switches or the conversation naturally leads there.
  - Never repeat the same question.
  - Keep the tone human and conversational.

  Candidate resume context:
  ${JSON.stringify(resumeContext)}

  Start with a realistic interview opener based on the resume context.
	`
	          }
	        ];

        const firstQuestion = await generateInterviewQuestion({
          stage: "technical_foundation",
          resumeContext,
          answer: "",
          previousQuestion: "",
          askedQuestions
        });

	        askedQuestions.push(firstQuestion);

	        messages.push({
	          role: "assistant",
	          content: firstQuestion
	        });

	        await InterviewSession.findByIdAndUpdate(sessionId, {
	          messages
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

	        const previousQuestion = [...messages]
	          .reverse()
	          .find((message) => message.role === "assistant")?.content || "";
	        const answerState = analyzeAnswer(answer);
	        const currentStage = getInterviewStage(interviewTurn);
	        const nextStage = answerState.requestedStage ||
            (answerState.incomplete
              ? currentStage
              : getInterviewStage(interviewTurn + 1));

          const recentTranscript = messages.slice(-8).map((message) => `${message.role}: ${message.content}`).join("\n");

          // ⭐ Senior evaluation prompt
          const evaluationPrompt = [
            {
	            role: "system",
	            content: `
  You are a senior technical interviewer having a natural conversation.

  TASK:

  - Read the candidate's latest answer carefully.
  - Judge whether it actually addresses the previous question.
  - If the answer is weak, partial, or an apology, stay on the same idea and ask one clarifying follow-up.
  - If the answer is solid, ask one deeper follow-up that feels natural and specific.
  - Use the resume context and recent transcript, but do not follow a scripted curriculum.
  - Only change topic if the candidate clearly switches topic or the conversation naturally moves there.
  - Avoid generic feedback.
  - Never repeat or paraphrase an earlier question.
  - Keep the tone human, concise, and encouraging.

  IMPORTANT:

  - Immediately previous question: ${previousQuestion}
  - Candidate resume context: ${JSON.stringify(resumeContext)}
  - Recent transcript: ${recentTranscript}
  - Already asked questions: ${JSON.stringify(askedQuestions)}

  Return ONLY valid JSON:

	{
	  "feedback": "human-like supportive feedback",
		  "nextQuestion": "new technical question",
      "shouldAdvance": false,
		  "answerQuality": "incomplete | acceptable | strong"
		}
		`
            },
            ...messages.filter((message, index) => !(index === 0 && message.role === "system"))
          ];

	        let evaluation = buildFallbackEvaluation(answer, previousQuestion, nextStage, resumeContext, askedQuestions);

        try {
          const aiResponse = await askAI(evaluationPrompt);
          console.log("AI RAW RESPONSE:", aiResponse);
          const parsedEvaluation = parseJsonFromResponse(aiResponse);

	          evaluation = {
	            feedback: parsedEvaluation.feedback || evaluation.feedback,
	            nextQuestion: parsedEvaluation.nextQuestion || evaluation.nextQuestion,
              shouldAdvance: typeof parsedEvaluation.shouldAdvance === "boolean"
                ? parsedEvaluation.shouldAdvance
                : evaluation.shouldAdvance,
              answerQuality: parsedEvaluation.answerQuality || evaluation.answerQuality
	          };
	        } catch (aiError) {
	          console.log("Evaluation AI fallback used:", aiError.message);
	        }

          if (answerState.incomplete && !answerState.isTopicSwitch) {
            evaluation = {
              ...evaluation,
              feedback: evaluation.feedback || "You have the starting idea, but the answer is still incomplete.",
              nextQuestion: buildSameTopicFollowUp(previousQuestion, answer),
              shouldAdvance: false,
              answerQuality: "incomplete"
            };
          }

        // ⭐ Prevent repeated questions (backend safety)
	        if (
            !evaluation.nextQuestion ||
            (evaluation.shouldAdvance !== false && hasSimilarQuestion(evaluation.nextQuestion, askedQuestions))
          ) {

	          evaluation.nextQuestion = await generateInterviewQuestion({
              stage: nextStage,
              resumeContext,
              answer,
              previousQuestion,
              askedQuestions
            }) ||
              buildContextualFallbackQuestion(answer, askedQuestions);

	        }

	        askedQuestions.push(evaluation.nextQuestion);
	        if (evaluation.shouldAdvance !== false) {
	          interviewTurn = answerState.requestedStage
              ? getStageTurn(answerState.requestedStage)
              : interviewTurn + 1;
	        }

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

	Score strictly from 0 to 10:
	0-2: no answers, irrelevant answers, or unable to explain basics.
	3-4: weak understanding with major gaps.
	5-6: partially correct answers, some practical knowledge, needs mentoring.
	7-8: solid job-ready understanding with clear reasoning and examples.
	9-10: exceptional depth, tradeoffs, debugging ability, and production judgment.

		Do not inflate the score for politeness. Short, vague, copied, or generic answers must score below 6.
		Base the score only on the candidate answers in this transcript.
		Do not penalize grammar, typos, informal wording, or non-polished phrasing if the technical meaning is clear.
		Reward practical debugging steps, correct tradeoffs, concrete examples, and honest uncertainty.

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

	Use a strict 0 to 10 overallRating. Short, vague, irrelevant, or mostly incorrect answers must be below 6.
	Ignore grammar and typos when the candidate's technical intent is understandable.

	Interview transcript:
	${messages.slice(-12).map((m) => `${m.role}: ${m.content}`).join("\n")}
`;

            const retryResponse = await askAI(compactPrompt);
            parsedSummary = parseJsonFromResponse(retryResponse);
          }

          const normalizedRating = normalizeRating(parsedSummary.overallRating);
          const totalScore = Math.round(normalizedRating * 10);
          const questionCount = messages.filter((m) => m.role === "assistant").length;
          const normalizedRecommendation = recommendationFromRating(normalizedRating);

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
