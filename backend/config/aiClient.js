const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


const formatMessagesForGemini = (messages) => {

  return messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isResourceExhausted = (error) => {
  const msg = String(error?.message || "");
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
};

const isNetworkFailure = (error) => {
  const msg = String(error?.message || "");
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("sending request")
  );
};

const askAI = async (prompt) => {

  let contents;

  // If conversation memory (array)
  if (Array.isArray(prompt)) {

    contents = formatMessagesForGemini(prompt);

  } else {

    // simple string prompt
    contents = [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ];
  }

  const maxAttempts = 3;
  let delay = 800;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents
      });

      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error.message);

      const rateLimited = isResourceExhausted(error);
      const networkFailure = isNetworkFailure(error);
      const retryable = rateLimited || networkFailure;
      const isLast = attempt === maxAttempts;

      if (!retryable || isLast) {
        const finalError = new Error(
          rateLimited
            ? "AI_RATE_LIMITED"
            : networkFailure
              ? "AI_NETWORK_ERROR"
              : "AI request failed"
        );
        finalError.cause = error;
        throw finalError;
      }

      await sleep(delay);
      delay *= 2;
    }
  }
};

module.exports = askAI;
