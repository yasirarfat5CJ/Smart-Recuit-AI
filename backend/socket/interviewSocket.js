const askAI = require("../config/aiClient");
const Candidate = require("../models/Candidate");
const InterviewSession = require("../models/interviewSession");

module.exports = (io) => {

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

   
    let messages = [];

    
    let sessionId = null;
    let totalScore = 0;
    let questionCount = 0;

 

    socket.on("startInterview", async ({ candidateId }) => {

      try {

        const candidate = await Candidate.findById(candidateId);

        if (!candidate) {
          return socket.emit("error", "Candidate not found");
        }

        // Create interview session
        const session = await InterviewSession.create({
          candidateId,
          messages: [],
          totalScore: 0,
          questionCount: 0
        });

        sessionId = session._id;

        // Initialize memory
        messages = [
          {
            role: "system",
            content: `
You are a professional technical interviewer.

Candidate skills:
${JSON.stringify(candidate.parsedResume.skills)}

Rules:
- Ask ONE question at a time.
- Increase difficulty gradually.
- Focus on technical evaluation.
`
          }
        ];

        // Ask first question
        const firstQuestion = await askAI(messages);

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

        // Save candidate answer
        messages.push({
          role: "user",
          content: answer
        });

        const evaluationPrompt = [
          ...messages,
          {
            role: "system",
            content: `
You are a technical interviewer.

Evaluate the LAST candidate answer.

Return ONLY valid JSON:

{
  "score": number between 0-10,
  "feedback": "short feedback",
  "nextQuestion": "next technical question"
}
`
          }
        ];

        const aiResponse = await askAI(evaluationPrompt);

        console.log("AI RAW RESPONSE:", aiResponse);

        // Clean JSON safely
        const cleanJson = aiResponse
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error("Invalid AI JSON response");
        }

        const evaluation = JSON.parse(jsonMatch[0]);

        // Update tracking
        totalScore += evaluation.score;
        questionCount += 1;

        // Save next question into memory
        messages.push({
          role: "assistant",
          content: evaluation.nextQuestion
        });

        // Update DB session
        await InterviewSession.findByIdAndUpdate(sessionId, {
          messages,
          totalScore,
          questionCount
        });

        // Send evaluation + next question
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
  "overallRating": number between 0-10,
  "recommendation": "Hire or No Hire"
}
`
      }

    ];

    const aiResponse = await askAI(summaryPrompt);

    console.log("FINAL SUMMARY RAW:", aiResponse);

    // Clean JSON
    const cleanJson = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Invalid summary JSON");
    }

    const finalSummary = JSON.parse(jsonMatch[0]);

    // Save into DB
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
