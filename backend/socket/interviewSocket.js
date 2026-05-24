const askAI = require("../config/aiClient");
const jwt = require("jsonwebtoken");
const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");
const User = require("../models/User");

module.exports = (io) => {

  // ─────────────────────────────────────────────────────────────────────────
  // Stateless helper functions
  // ─────────────────────────────────────────────────────────────────────────

  const sanitizeQuestionText = (text) =>
    String(text || "")
      .replace(/^[-*\s"'`]+/, "")
      .replace(/[-*\s"'`]+$/, "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeQuestion = (q) =>
    String(q || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(
        /\b(can|could|please|tell|me|about|explain|describe|what|why|how|the|a|an|your|you)\b/g,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

  const questionSimilarity = (a, b) => {
    const ta = new Set(normalizeQuestion(a).split(" ").filter(Boolean));
    const tb = new Set(normalizeQuestion(b).split(" ").filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    return [...ta].filter((t) => tb.has(t)).length / Math.max(ta.size, tb.size);
  };

  const hasSimilarQuestion = (q, asked) =>
    asked.some(
      (a) =>
        normalizeQuestion(q) === normalizeQuestion(a) ||
        questionSimilarity(q, a) >= 0.72
    );

  const focusAppearsInQuestion = (focus, question) => {
    if (!focus) return true;
    const focusTokens = normalizeQuestion(focus).split(" ").filter((token) => token.length > 1);
    const questionText = normalizeQuestion(question);
    return focusTokens.some((token) => questionText.includes(token));
  };

  const buildFocusQuestion = (focus) =>
    `Can you explain ${focus} based on what you mentioned in your resume?`;

  const parseJsonFromResponse = (raw) => {
    if (!raw || !String(raw).trim()) throw new Error("Empty AI response");
    const cleaned = String(raw).replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // Try all {...} blocks from shortest to find the evaluation JSON
      const blocks = [...cleaned.matchAll(/\{[\s\S]*?\}/g)].map((m) => m[0]);
      for (const block of blocks) {
        try { return JSON.parse(block); } catch (_) { /* next */ }
      }
      const greedy = cleaned.match(/\{[\s\S]*\}/);
      if (greedy) return JSON.parse(greedy[0]);
      throw new Error("No valid JSON in AI response");
    }
  };

  const normalizeRating = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    if (n > 10 && n <= 100) return Math.max(0, Math.min(10, n / 10));
    return Math.max(0, Math.min(10, n));
  };

  const recommendationFromRating = (r) => (r >= 7 ? "Hire" : "No Hire");

  const compactText = (value, max = 180) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);

  const getProjectTitle = (project) => {
    if (!project) return "";
    if (typeof project === "string") return compactText(project);
    return compactText(project.title || project.name || project.description);
  };

  const buildResumeInterviewPlan = async (resumeContext = {}) => {
    const fallbackTopics = [
      ...(resumeContext.projects || []).map((project) => ({
        focus: getProjectTitle(project),
        evidence: project,
        reason: "listed resume project"
      })),
      ...(resumeContext.experience || []).map((item) => ({
        focus: compactText(item.role || item.title || item.company || item.description),
        evidence: item,
        reason: "listed experience"
      })),
      ...(resumeContext.skills || []).map((skill) => ({
        focus: compactText(skill),
        evidence: skill,
        reason: "listed skill"
      })),
      ...(resumeContext.techStack || []).map((skill) => ({
        focus: compactText(skill),
        evidence: skill,
        reason: "listed technology"
      }))
    ].filter((item) => item.focus);

    const fallbackPlan = fallbackTopics.length
      ? fallbackTopics.slice(0, 12)
      : [{ focus: "the candidate's resume", evidence: resumeContext, reason: "resume overview" }];

    const prompt = `
Create a dynamic interview plan using ONLY this parsed resume.

Return ONLY valid JSON:
{
  "topics": [
    {
      "focus": "specific resume topic/project/skill",
      "evidence": "short reason from resume",
      "whyAsk": "what this topic helps evaluate"
    }
  ]
}

Rules:
- Do not add generic interview sections unless they appear in the resume.
- Do not invent skills, projects, companies, or tools.
- Prefer concrete projects, experience items, and strongest resume skills.
- Order topics from strongest / most relevant resume evidence to weaker evidence.
- Keep each focus short.

Resume:
${JSON.stringify(resumeContext)}
`.trim();

    try {
      const response = await askAI(prompt);
      const parsed = parseJsonFromResponse(response);
      const topics = Array.isArray(parsed.topics)
        ? parsed.topics
          .map((topic) => ({
            focus: compactText(topic.focus),
            evidence: compactText(topic.evidence || topic.reason || topic.whyAsk),
            reason: compactText(topic.whyAsk || topic.reason || topic.evidence)
          }))
          .filter((topic) => topic.focus)
        : [];

      return topics.length ? topics.slice(0, 12) : fallbackPlan;
    } catch (error) {
      console.warn("[buildResumeInterviewPlan] AI failed:", error.message);
      return fallbackPlan;
    }
  };

  const getPlanFocus = (plan, turn) =>
    plan.length ? plan[Math.min(turn, plan.length - 1)] : { focus: "the candidate's resume" };

  const createLocalResponseState = (answer) => {
    const text = String(answer || "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const asksClarification = /\?/.test(text) ||
      /\b(what do you mean|can you explain|could you explain|clarify|example|concrete example|meaning)\b/i.test(text);

    return {
      wordCount: words.length,
      intent: asksClarification ? "clarification_request" : "answer",
      requestedFocus: null,
      answerQuality: words.length < 18 ? "incomplete" : "acceptable",
      shouldAdvance: asksClarification ? false : words.length >= 18,
      needsSameTopicFollowUp: asksClarification || words.length < 18,
      feedbackIntent: asksClarification ? "clarify_question" : words.length < 18 ? "needs_more_detail" : "acknowledge",
      confidence: 0.4
    };
  };

  const buildFallbackSummary = () => ({
    strengths: "Good effort throughout the interview.",
    weaknesses: "Could not generate a detailed AI summary.",
    overallFeedback: "Please retry or review the chat transcript manually.",
    recommendation: "No Hire",
    overallRating: 0
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AI classifiers and question generator
  // ─────────────────────────────────────────────────────────────────────────

  const classifyCandidateResponse = async ({ answer, previousQuestion, currentStage, resumeContext, recentTranscript }) => {
    const fallback = createLocalResponseState(answer);
    const prompt = `
Classify a candidate's latest interview response for a dynamic technical interview.

Return ONLY valid JSON:
{
  "intent": "answer | cannot_answer | topic_switch | clarification_request",
  "requestedFocus": "short topic phrase requested by the candidate, or null",
  "answerQuality": "empty | incomplete | acceptable | strong",
  "shouldAdvance": false,
  "needsSameTopicFollowUp": true,
  "feedbackIntent": "acknowledge | needs_more_detail | honest_gap | switch_topic | clarify_question | skip_after_repeated_gap",
  "confidence": 0.0
}

Guidelines:
- "cannot_answer" means the candidate says they do not know, did not apply/use it, cannot recall, wants to skip, or apologizes instead of answering.
- "topic_switch" means the candidate asks to move to another area.
- "clarification_request" means the candidate asks what the question means or asks for clarification/example instead of answering.
- Do not infer a role-specific topic from sparse text.
- If the answer is short but contains a correct core idea, mark incomplete unless it gives at least one example, reason, tradeoff, edge case, or complexity.
- requestedFocus must preserve the exact requested topic when present, for example "the recruitment platform", "LangChain", "database design", "system design". Do not replace it with a different resume skill.

Previous question: ${previousQuestion}
Current stage: ${currentStage}
Resume context: ${JSON.stringify(resumeContext)}
Recent transcript:
${recentTranscript}
Candidate answer: ${answer}
`.trim();

    try {
      const response = await askAI(prompt);
      const parsed = parseJsonFromResponse(response);

      return {
        ...fallback,
        intent: ["answer", "cannot_answer", "topic_switch", "clarification_request"].includes(parsed.intent)
          ? parsed.intent
          : fallback.intent,
        requestedFocus: parsed.requestedFocus ? sanitizeQuestionText(parsed.requestedFocus) : null,
        answerQuality: ["empty", "incomplete", "acceptable", "strong"].includes(parsed.answerQuality)
          ? parsed.answerQuality
          : fallback.answerQuality,
        shouldAdvance: typeof parsed.shouldAdvance === "boolean"
          ? parsed.shouldAdvance
          : fallback.shouldAdvance,
        needsSameTopicFollowUp: typeof parsed.needsSameTopicFollowUp === "boolean"
          ? parsed.needsSameTopicFollowUp
          : fallback.needsSameTopicFollowUp,
        feedbackIntent: parsed.feedbackIntent || fallback.feedbackIntent,
        confidence: Number.isFinite(Number(parsed.confidence)) ? Number(parsed.confidence) : fallback.confidence
      };
    } catch (err) {
      console.warn("[classifyCandidateResponse] AI failed:", err.message);
      return fallback;
    }
  };

  const generateInterviewQuestion = async ({ resumeContext, answer, previousQuestion, askedQuestions, currentFocus, requestedFocus = null }) => {
    const prompt = `
You are a senior technical interviewer conducting a real-time interview.

Rules:
- Ask exactly ONE next question.
- Build directly on the candidate's latest answer.
- Do not reuse or closely paraphrase any previously asked question.
- Keep the question natural and specific — probe understanding, tradeoffs, edge cases, or debugging.
- Do not include feedback inside the question.
- If requested focus is present, the question must be about that focus. Do not substitute a different resume skill.
- If requested focus is absent, the question must be about the current resume focus.

Current resume focus: ${JSON.stringify(currentFocus)}
Requested focus: ${requestedFocus || "none"}
Previous question: ${previousQuestion}
Candidate answer: ${answer}
Resume context: ${JSON.stringify(resumeContext)}
Already asked (do NOT repeat): ${JSON.stringify(askedQuestions)}

Return only the question text — no JSON, no bullets, no preamble.
`.trim();

    try {
      const raw = await askAI(prompt);
      const q = sanitizeQuestionText(raw);
      if (q && !hasSimilarQuestion(q, askedQuestions) && focusAppearsInQuestion(requestedFocus, q)) return q;
    } catch (err) {
      console.warn("[generateInterviewQuestion] AI failed:", err.message);
    }

    return buildFocusQuestion(requestedFocus || currentFocus?.focus || "the most relevant part of your resume");
  };

  const generateEvaluationTurn = async ({ responseState, resumeContext, answer, previousQuestion, askedQuestions, recentTranscript, consecutiveMisses, currentFocus }) => {
    const prompt = `
You are a senior technical interviewer. Generate the next interview turn for any role dynamically.

Return ONLY valid JSON:
{
  "feedback": "one short, natural sentence",
  "nextQuestion": "one focused next question",
  "shouldAdvance": false,
  "answerQuality": "empty | incomplete | acceptable | strong | skipped | topic_switch"
}

Rules:
- Do not invent experience the candidate denies.
- If intent is cannot_answer and consecutiveMisses is 0, be supportive and ask a simpler conceptual version of the same topic.
- If intent is cannot_answer and consecutiveMisses is 1 or more, skip that question and move to a different relevant area.
- If intent is topic_switch, honor the requested focus.
- If requestedFocus is present, the next question must be about that focus. Do not replace it with a different technology from the resume.
- If intent is clarification_request, explain what you mean in simple terms and ask the same question in a clearer way. Do not advance.
- If answer is incomplete, stay on the same topic and ask for a small example, reason, tradeoff, edge case, or complexity.
- If answer is acceptable/strong, ask a deeper follow-up or move naturally.
- Avoid hardcoded curricula. Use the job/resume context and transcript.
- Never mention unrelated technologies that are not in the question, answer, transcript, or resume.
- Do not repeat or closely paraphrase already asked questions.

Response classification:
${JSON.stringify(responseState)}

Current resume focus: ${JSON.stringify(currentFocus)}
Requested focus: ${responseState.requestedFocus || "none"}
Previous question: ${previousQuestion}
Candidate answer: ${answer}
Consecutive cannot-answer count before this answer: ${consecutiveMisses}
Resume context: ${JSON.stringify(resumeContext)}
Recent transcript:
${recentTranscript}
Already asked questions:
${JSON.stringify(askedQuestions)}
`.trim();

    try {
      const response = await askAI(prompt);
      const parsed = parseJsonFromResponse(response);

      return {
        feedback: sanitizeQuestionText(parsed.feedback),
        nextQuestion: sanitizeQuestionText(parsed.nextQuestion),
        shouldAdvance: typeof parsed.shouldAdvance === "boolean"
          ? parsed.shouldAdvance
          : responseState.shouldAdvance,
        answerQuality: parsed.answerQuality || responseState.answerQuality
      };
    } catch (err) {
      console.warn("[generateEvaluationTurn] AI failed:", err.message);
      return {
        feedback: responseState.intent === "cannot_answer"
          ? "No problem; let us adjust the question."
          : "Thanks, I have enough context to continue.",
          nextQuestion: await generateInterviewQuestion({
          resumeContext,
          answer,
          previousQuestion,
          askedQuestions,
          currentFocus,
          requestedFocus: responseState.requestedFocus
        }),
        shouldAdvance: responseState.shouldAdvance,
        answerQuality: responseState.answerQuality
      };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Auth middleware
  // ─────────────────────────────────────────────────────────────────────────

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
      const user = await User.findById(decoded.id).select("role email");
      if (!user) return next(new Error("Unauthorized"));

      socket.user = { id: decoded.id, role: user.role, email: user.email };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Connection handler
  // ─────────────────────────────────────────────────────────────────────────

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Per-socket mutable state — ALL reset in startInterview.
    let messages       = [];
    let sessionId      = null;
    let interviewTurn  = 0;
    let resumeContext  = {};
    let resumeInterviewPlan = [];
    let askedQuestions = [];
    let consecutiveApologies = 0;

    // ── FIX: reset everything before each new interview session ─────────────
    // Without this, reconnecting or calling startInterview twice bleeds
    // messages/askedQuestions/sessionId from the previous session.
    const resetState = () => {
      messages       = [];
      sessionId      = null;
      interviewTurn  = 0;
      resumeContext  = {};
      resumeInterviewPlan = [];
      askedQuestions = [];
      consecutiveApologies = 0;
    };

    // ── startInterview ───────────────────────────────────────────────────────

    socket.on("startInterview", async ({ candidateId }) => {
      try {
        if (socket.user?.role !== "candidate") {
          return socket.emit("error", "Only candidates can start interviews");
        }

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return socket.emit("error", "Candidate not found");

        const ownsByUserId =
          candidate.userId && String(candidate.userId) === String(socket.user.id);
        const ownsByEmail =
          candidate.email &&
          socket.user.email &&
          String(candidate.email).toLowerCase() === String(socket.user.email).toLowerCase();

        if (!ownsByUserId && !ownsByEmail) {
          return socket.emit("error", "Access denied");
        }

        // Reset before building new session state
        resetState();

        resumeContext = {
          skills:     candidate.parsedResume?.skills    || [],
          techStack:  candidate.parsedResume?.techStack || candidate.parsedResume?.tech_stack || [],
          projects:   candidate.parsedResume?.projects  || [],
          experience: candidate.parsedResume?.experience || [],
          education:  candidate.parsedResume?.education  || []
        };
        resumeInterviewPlan = await buildResumeInterviewPlan(resumeContext);
        const firstFocus = getPlanFocus(resumeInterviewPlan, 0);

        messages = [
          {
            role: "system",
            content: `
You are a senior technical interviewer having a natural one-on-one conversation.

INTERVIEW STYLE:
- Be warm, focused, and adaptive.
- Ask exactly one question at a time.
- Base every next question on the candidate's latest answer.
- If the answer is incomplete, ask a short clarifying follow-up on the same idea.
- If the answer is strong, go a little deeper: tradeoff, edge case, or production example.
- Only change topic when the candidate clearly switches or conversation naturally leads there.
- Never repeat the same question.
- Keep tone human and conversational.

Candidate resume context:
${JSON.stringify(resumeContext)}

	Start with a question based only on the strongest evidence in the resume.
	`.trim()
          }
        ];

        const firstQuestion = await generateInterviewQuestion({
          resumeContext,
          answer: "",
          previousQuestion: "",
          askedQuestions,
          currentFocus: firstFocus
        });

        askedQuestions.push(firstQuestion);
        messages.push({ role: "assistant", content: firstQuestion });

        // Persist session with askedQuestions so reconnect can restore them
        const session = await InterviewSession.create({
          candidateId,
          messages,
          askedQuestions,
          currentStage: "technical_foundation",
          interviewTurn: 0,
          status: "active"
        });

        sessionId = session._id;

        socket.emit("aiQuestion", firstQuestion);

      } catch (err) {
        console.error("[startInterview] Error:", err);
        socket.emit("error", "Interview start failed");
      }
    });

    // ── candidateAnswer ──────────────────────────────────────────────────────

    socket.on("candidateAnswer", async ({ answer }) => {
      try {
        if (!sessionId) {
          return socket.emit("error", "Session not initialised — please start the interview first");
        }

        messages.push({ role: "user", content: answer });

        const previousQuestion =
          [...messages].reverse().find((m) => m.role === "assistant")?.content || "";

        const currentFocus = getPlanFocus(resumeInterviewPlan, interviewTurn);

        const recentTranscript = messages
          .slice(-8)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");

        const responseState = await classifyCandidateResponse({
          answer,
          previousQuestion,
          currentStage: currentFocus.focus,
          resumeContext,
          recentTranscript
        });

        const missesBeforeThisAnswer = consecutiveApologies;
        consecutiveApologies = responseState.intent === "cannot_answer"
          ? consecutiveApologies + 1
          : 0;

        if (responseState.intent === "clarification_request") {
          consecutiveApologies = 0;
        }

        const targetFocus = responseState.requestedFocus
          ? { focus: responseState.requestedFocus, evidence: "candidate requested topic" }
          : responseState.needsSameTopicFollowUp
            ? currentFocus
            : getPlanFocus(resumeInterviewPlan, interviewTurn + 1);

        let evaluation = await generateEvaluationTurn({
          responseState,
          resumeContext,
          answer,
          previousQuestion,
          askedQuestions,
          recentTranscript,
          consecutiveMisses: missesBeforeThisAnswer,
          currentFocus: targetFocus
        });

        if (responseState.requestedFocus && !focusAppearsInQuestion(responseState.requestedFocus, evaluation.nextQuestion)) {
          evaluation.nextQuestion = buildFocusQuestion(responseState.requestedFocus);
        }

        if (responseState.intent === "clarification_request") {
          evaluation.shouldAdvance = false;
          evaluation.answerQuality = "incomplete";
        }

        if (responseState.intent === "cannot_answer" && missesBeforeThisAnswer >= 1) {
          evaluation.shouldAdvance = true;
          evaluation.answerQuality = "skipped";
          consecutiveApologies = 0;
        }

        // Safety net: regenerate if next question is missing or a duplicate
        if (
          !evaluation.nextQuestion ||
          (evaluation.shouldAdvance !== false &&
            hasSimilarQuestion(evaluation.nextQuestion, askedQuestions))
        ) {
          evaluation.nextQuestion = await generateInterviewQuestion({
            resumeContext,
            answer,
            previousQuestion,
            askedQuestions,
            currentFocus: targetFocus,
            requestedFocus: responseState.requestedFocus
          });
        }

        evaluation.nextQuestion = sanitizeQuestionText(evaluation.nextQuestion);
        askedQuestions.push(evaluation.nextQuestion);

        // Advance turn counter
        if (evaluation.shouldAdvance !== false) {
          interviewTurn += 1;
        }

        messages.push({ role: "assistant", content: evaluation.nextQuestion });

        // FIX: persist askedQuestions, currentStage, interviewTurn so a
        // reconnecting socket can restore deduplication and stage state
        await InterviewSession.findByIdAndUpdate(sessionId, {
          messages,
          askedQuestions,
          currentStage: "technical_foundation",
          interviewTurn
        });

        socket.emit("aiEvaluation", evaluation);

      } catch (err) {
        console.error("[candidateAnswer] Error:", err);
        socket.emit("error", "AI evaluation failed");
      }
    });

    // ── endInterview ─────────────────────────────────────────────────────────

    socket.on("endInterview", async () => {
      try {
        if (!sessionId) return socket.emit("error", "Session not found");

        // Pass full conversation as array — askAI handles it correctly.
        // Appending the summary system message at the end so the AI sees the
        // full transcript and then the scoring instructions.
        const summaryMessages = [
          ...messages,
          {
            role: "system",
            content: `
You are a senior technical interviewer. Analyse the full interview transcript above.

SCORING (0–10):
0-2: No answers or completely irrelevant.
3-4: Weak understanding, major gaps.
5-6: Partially correct, some practical knowledge, needs mentoring.
7-8: Solid, job-ready, clear reasoning and examples.
9-10: Exceptional depth, tradeoffs, debugging, production judgment.

RULES:
- Do not inflate for politeness. Short, vague, or generic answers score below 6.
- Do not penalise grammar/typos when technical meaning is clear.
- Reward debugging steps, correct tradeoffs, concrete examples, honest uncertainty.

Return ONLY valid JSON:
{
  "strengths": "2–3 sentences on candidate strengths",
  "weaknesses": "2–3 sentences on areas of improvement",
  "overallFeedback": "3–4 sentence professional final evaluation",
  "recommendation": "Hire or No Hire",
  "overallRating": 0
}
`.trim()
          }
        ];

        let finalSummary = buildFallbackSummary();

        try {
          let parsedSummary;

          try {
            const aiResponse = await askAI(summaryMessages);
            parsedSummary = parseJsonFromResponse(aiResponse);
          } catch (primaryErr) {
            console.warn("[endInterview] Primary summary failed, trying compact prompt:", primaryErr.message);

            // Compact retry: plain string prompt with last 12 messages only
            const compactTranscript = messages
              .filter((m) => m.role !== "system")
              .slice(-12)
              .map((m) => `${m.role}: ${m.content}`)
              .join("\n");

            const compactPrompt = `
You are a senior technical interviewer.
Return ONLY valid JSON — no markdown, no extra text:
{
  "strengths": "",
  "weaknesses": "",
  "overallFeedback": "",
  "recommendation": "Hire or No Hire",
  "overallRating": 0
}

Strict 0–10 overallRating. Short or vague answers score below 6.
Ignore grammar if technical meaning is clear.

Transcript:
${compactTranscript}
`.trim();

            const retryResponse = await askAI(compactPrompt);
            parsedSummary = parseJsonFromResponse(retryResponse);
          }

          const overallRating  = normalizeRating(parsedSummary.overallRating);
          const totalScore     = Math.round(overallRating * 10);
          const questionCount  = messages.filter((m) => m.role === "assistant").length;

          finalSummary = {
            strengths:       parsedSummary.strengths       || finalSummary.strengths,
            weaknesses:      parsedSummary.weaknesses      || finalSummary.weaknesses,
            overallFeedback: parsedSummary.overallFeedback || finalSummary.overallFeedback,
            recommendation:  recommendationFromRating(overallRating),
            overallRating
          };

          await InterviewSession.findByIdAndUpdate(sessionId, {
            finalSummary,
            totalScore,
            questionCount,
            status: "completed"
          });

          return socket.emit("finalSummary", finalSummary);

        } catch (summaryErr) {
          console.warn("[endInterview] Summary error:", summaryErr.message);
        }

        await InterviewSession.findByIdAndUpdate(sessionId, {
          finalSummary,
          status: "completed"
        });

        socket.emit("finalSummary", finalSummary);

      } catch (err) {
        console.error("[endInterview] Error:", err);
        socket.emit("error", "Final summary generation failed");
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      console.log("User disconnected:", socket.id);
      if (sessionId) {
        try {
          // Only mark abandoned if interview never completed
          await InterviewSession.findOneAndUpdate(
            { _id: sessionId, status: "active" },
            { status: "abandoned" }
          );
        } catch (_) { /* best-effort */ }
      }
    });

  });

};
