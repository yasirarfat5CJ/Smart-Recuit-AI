const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const formatMessagesForGroq = (messages) => {
  return messages.map((msg) => ({
    role: ["system", "assistant", "user"].includes(msg.role) ? msg.role : "user",
    content: String(msg.content || "")
  }));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isResourceExhausted = (error) => {
  const msg = String(error?.message || "");
  return msg.includes("429") || msg.includes("rate_limit_exceeded");
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
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  let messages;

  // If conversation memory (array)
  if (Array.isArray(prompt)) {

    messages = formatMessagesForGroq(prompt);

  } else {

    // simple string prompt
    messages = [
      {
        role: "user",
        content: String(prompt || "")
      }
    ];
  }

  const maxAttempts = 3;
  let delay = 800;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`${response.status} ${data?.error?.message || response.statusText}`);
      }

      return data?.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq Error:", error.message);

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
