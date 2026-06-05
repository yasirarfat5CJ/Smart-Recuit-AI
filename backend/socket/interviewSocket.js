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

  const parseCandidateControl = (answer) => {
    const text = String(answer || "").trim();
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    const asksClarification = /\?/.test(text) ||
      /\b(what do you mean|can you explain|could you explain|clarify|meaning|what is a concrete example)\b/i.test(normalized);
    const cannotAnswer = /^(sorry|sor+ry|no|i don'?t know|i do not know|not sure|skip|pass)[.! ]*$/i.test(normalized) ||
      /\b(i did not|i didn't|didn'?t apply|didn'?t use|cannot answer|can'?t answer|don'?t remember|do not remember)\b/i.test(normalized);
    const requestsSwitch = /\b(switch|jump|move|go|change|next)\b.*\b(topic|project|projects|dsa|oops|subject|subjects|area|question|questions)\b/i.test(normalized) ||
      /\b(another|other|next)\s+project\b/i.test(normalized);

    if (asksClarification) {
      return { intent: "clarification_request", requestedFocus: null };
    }

    if (requestsSwitch) {
      const explicitFocus = normalized.match(/\b(?:to|into)\s+(.+)$/i)?.[1]
        ?.replace(/\bquestions?\b/gi, "")
        .trim();
      const wantsAnotherProject = /\b(project|projects)\b/i.test(normalized);

      return {
        intent: "topic_switch",
        requestedFocus: explicitFocus && !/^(another|other|next)?\s*projects?$/.test(explicitFocus)
          ? explicitFocus
          : null,
        requestedCategory: wantsAnotherProject ? "project" : null
      };
    }

    if (cannotAnswer) {
      return { intent: "cannot_answer", requestedFocus: null };
    }

    return null;
  };

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

  const readinessFromRating = (rating) => {
    if (rating >= 7) return "Interview Ready";
    if (rating >= 5) return "Developing";
    return "Needs Practice";
  };

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

  const buildResumeInterviewPlan = async (resumeContext = {}, interviewType = "technical") => {
    const allTopics = [
      ...(resumeContext.projects || []).map((project) => ({
        focus: getProjectTitle(project),
        evidence: project,
        reason: "listed resume project",
        category: "project"
      })),
      ...(resumeContext.experience || []).map((item) => ({
        focus: compactText(item.role || item.title || item.company || item.description),
        evidence: item,
        reason: "listed experience",
        category: "experience"
      })),
      ...(resumeContext.skills || []).map((skill) => ({
        focus: compactText(skill),
        evidence: skill,
        reason: "listed skill",
        category: "skill"
      })),
      ...(resumeContext.techStack || []).map((skill) => ({
        focus: compactText(skill),
        evidence: skill,
        reason: "listed technology",
        category: "skill"
      })),
      ...(resumeContext.education || []).map((item) => ({
        focus: compactText(item.degree || item.institution || item),
        evidence: item,
        reason: "listed education",
        category: "education"
      }))
    ].filter((item) => item.focus);

    const fallbackTopics = interviewType === "project"
      ? allTopics.filter((item) => item.category === "project")
      : interviewType === "technical"
        ? allTopics.filter((item) => ["skill", "project"].includes(item.category))
        : allTopics.filter((item) => ["project", "experience", "education"].includes(item.category));

    const fallbackPlan = fallbackTopics.length
      ? fallbackTopics.slice(0, 12)
      : [{ focus: "the candidate's resume", evidence: resumeContext, reason: "resume overview", category: "skill" }];

    const prompt = `
Create a ${interviewType} interview plan using ONLY this parsed resume.

Return ONLY valid JSON:
{
  "topics": [
    {
      "focus": "specific resume topic/project/skill",
      "evidence": "short reason from resume",
      "whyAsk": "what this topic helps evaluate",
      "category": "project | experience | skill | education"
    }
  ]
}

Rules:
- Interview mode is "${interviewType}".
- Project mode must use only listed projects and their technologies.
- Technical mode must use only listed skills, technologies, and technical project evidence.
- HR mode must ask behavioral questions tied to listed projects, education, or experience.
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
            reason: compactText(topic.whyAsk || topic.reason || topic.evidence),
            category: ["project", "experience", "skill", "education"].includes(topic.category)
              ? topic.category
              : "skill"
          }))
          .filter((topic) => topic.focus)
        : [];

      const modeTopics = topics.filter((topic) => {
        if (interviewType === "project") return topic.category === "project";
        if (interviewType === "technical") return ["project", "skill"].includes(topic.category);
        return ["project", "experience", "education"].includes(topic.category);
      });

      return modeTopics.length ? modeTopics.slice(0, 12) : fallbackPlan;
    } catch (error) {
      console.warn("[buildResumeInterviewPlan] AI failed:", error.message);
      return fallbackPlan;
    }
  };

  const getPlanFocus = (plan, turn) =>
    plan.length ? plan[Math.min(turn, plan.length - 1)] : { focus: "the candidate's resume" };

  const getNextPlanFocus = (plan, currentFocus, turn, category = null) => {
    const current = normalizeQuestion(currentFocus?.focus);
    const candidates = category === "project"
      ? plan.filter((item) => item.category === "project")
      : plan;
    const currentIndex = candidates.findIndex((item) => normalizeQuestion(item.focus) === current);
    const next = candidates
      .slice(currentIndex >= 0 ? currentIndex + 1 : 0)
      .find((item) => normalizeQuestion(item.focus) !== current);
    return next || getPlanFocus(plan, turn + 1);
  };

  const createLocalResponseState = (answer) => {
    const text = String(answer || "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const control = parseCandidateControl(answer);
    const asksClarification = control?.intent === "clarification_request";

    return {
      wordCount: words.length,
      intent: control?.intent || "answer",
      requestedFocus: control?.requestedFocus || null,
      requestedCategory: control?.requestedCategory || null,
      answerQuality: words.length < 18 ? "incomplete" : "acceptable",
      shouldAdvance: control?.intent === "topic_switch" || (!control && words.length >= 18),
      needsSameTopicFollowUp: asksClarification || (!control && words.length < 18),
      feedbackIntent: control?.intent === "topic_switch"
        ? "switch_topic"
        : control?.intent === "cannot_answer"
          ? "honest_gap"
          : asksClarification
            ? "clarify_question"
            : words.length < 18 ? "needs_more_detail" : "acknowledge",
      confidence: 0.4
    };
  };

  const buildFallbackSummary = () => ({
    strengths: "Good effort throughout the interview.",
    weaknesses: "Could not generate a detailed AI summary.",
    overallFeedback: "Please retry or review the chat transcript manually.",
    readinessLevel: "Needs Practice",
    overallRating: 0
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AI classifiers and question generator
  // ─────────────────────────────────────────────────────────────────────────

  const classifyCandidateResponse = async ({ answer, previousQuestion, currentStage, resumeContext, recentTranscript }) => {
    const fallback = createLocalResponseState(answer);
    const localControl = parseCandidateControl(answer);
    const prompt = `
Classify a student's latest response in a dynamic practice interview.

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
        intent: localControl?.intent || (["answer", "cannot_answer", "topic_switch", "clarification_request"].includes(parsed.intent)
          ? parsed.intent
          : fallback.intent),
        requestedFocus: localControl?.requestedFocus ||
          (parsed.requestedFocus ? sanitizeQuestionText(parsed.requestedFocus) : null),
        requestedCategory: localControl?.requestedCategory || null,
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
- If requested focus is a broad area such as DSA, OOPS, databases, or system design, mention that area explicitly in the question.
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
You are an adaptive interview coach. Generate the next interview turn dynamically.

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
    let activeFocus = null;
    let interviewType = "technical";

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
      activeFocus = null;
      interviewType = "technical";
    };

    // ── startInterview ───────────────────────────────────────────────────────

    socket.on("startInterview", async ({ candidateId, interviewType: requestedType }) => {
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
        interviewType = ["project", "technical", "hr"].includes(requestedType)
          ? requestedType
          : "technical";

        resumeContext = {
          skills:     candidate.parsedResume?.skills    || [],
          techStack:  candidate.parsedResume?.techStack || candidate.parsedResume?.tech_stack || [],
          projects:   candidate.parsedResume?.projects  || [],
          experience: candidate.parsedResume?.experience || [],
          education:  candidate.parsedResume?.education  || []
        };

        if (interviewType === "project" && resumeContext.projects.length === 0) {
          return socket.emit("error", "Add at least one project to your resume before starting project practice.");
        }

        if (
          interviewType === "technical" &&
          resumeContext.skills.length === 0 &&
          resumeContext.techStack.length === 0 &&
          resumeContext.projects.length === 0
        ) {
          return socket.emit("error", "Add technical skills or projects to your resume before starting technical practice.");
        }

        resumeInterviewPlan = await buildResumeInterviewPlan(resumeContext, interviewType);
        const firstFocus = getPlanFocus(resumeInterviewPlan, 0);
        activeFocus = firstFocus;

        messages = [
          {
            role: "system",
            content: `
You are conducting a ${interviewType} practice interview with a student.

INTERVIEW STYLE:
- Be warm, focused, and adaptive.
- Ask exactly one question at a time.
- Base every next question on the candidate's latest answer.
- If the answer is incomplete, ask a short clarifying follow-up on the same idea.
- If the answer is strong, go a little deeper: tradeoff, edge case, or production example.
- Only change topic when the candidate clearly switches or conversation naturally leads there.
- Never repeat the same question.
- Keep tone human and conversational.
- Stay strictly within the uploaded resume. Never invent a skill, project, role, or achievement.
- In project mode, ask only about listed projects and their implementation.
- In technical mode, ask only about listed skills, technologies, and technical project evidence.
- In HR mode, ask behavioral questions anchored to listed projects, education, or experience.

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
          interviewType,
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

        const currentFocus = activeFocus || getPlanFocus(resumeInterviewPlan, interviewTurn);

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

        const switchFocus = responseState.requestedFocus
          ? { focus: responseState.requestedFocus, evidence: "candidate requested topic" }
          : responseState.intent === "topic_switch"
            ? getNextPlanFocus(resumeInterviewPlan, currentFocus, interviewTurn, responseState.requestedCategory)
            : null;

        const targetFocus = switchFocus ||
          (responseState.intent === "cannot_answer"
            ? missesBeforeThisAnswer === 0
              ? currentFocus
              : getNextPlanFocus(resumeInterviewPlan, currentFocus, interviewTurn)
            : responseState.needsSameTopicFollowUp
            ? currentFocus
            : getNextPlanFocus(resumeInterviewPlan, currentFocus, interviewTurn));

        let evaluation;

        if (responseState.intent === "topic_switch") {
          evaluation = {
            feedback: "Sure, let us switch topics.",
            nextQuestion: await generateInterviewQuestion({
              resumeContext,
              answer: "",
              previousQuestion: "",
              askedQuestions,
              currentFocus: targetFocus,
              requestedFocus: targetFocus.focus
            }),
            shouldAdvance: true,
            answerQuality: "topic_switch"
          };
        } else {
          evaluation = await generateEvaluationTurn({
            responseState,
            resumeContext,
            answer,
            previousQuestion,
            askedQuestions,
            recentTranscript,
            consecutiveMisses: missesBeforeThisAnswer,
            currentFocus: targetFocus
          });
        }

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
          evaluation.nextQuestion = await generateInterviewQuestion({
            resumeContext,
            answer: "",
            previousQuestion: "",
            askedQuestions,
            currentFocus: targetFocus,
            requestedFocus: targetFocus.focus
          });
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
        activeFocus = targetFocus;

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
You are an interview coach. Analyse the full ${interviewType} practice interview transcript above.

SCORING (0–10):
0-2: No answers or completely irrelevant.
3-4: Weak understanding, major gaps.
5-6: Partially correct, some practical knowledge, needs mentoring.
7-8: Solid, interview-ready, clear reasoning and examples.
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
  "readinessLevel": "Needs Practice | Developing | Interview Ready",
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
  "readinessLevel": "Needs Practice | Developing | Interview Ready",
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
            readinessLevel:  readinessFromRating(overallRating),
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
