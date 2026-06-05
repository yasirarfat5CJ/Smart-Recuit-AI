const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const formatMessagesForOpenAI = (messages) => {
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

const isQuotaExceeded = (error) => {
  const msg = String(error?.message || "");
  return msg.includes("exceeded your current quota") || msg.includes("insufficient_quota");
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const messages = Array.isArray(prompt)
    ? formatMessagesForOpenAI(prompt)
    : [{ role: "user", content: String(prompt || "") }];

  const maxAttempts = 3;
  let delay = 800;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`${response.status} ${data?.error?.message || response.statusText}`);
      }

      return data?.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("OpenAI Error:", error.message);

      const quotaExceeded = isQuotaExceeded(error);
      const rateLimited = isResourceExhausted(error);
      const networkFailure = isNetworkFailure(error);
      const retryable = !quotaExceeded && (rateLimited || networkFailure);
      const isLast = attempt === maxAttempts;

      if (!retryable || isLast) {
        const finalError = new Error(
          quotaExceeded
            ? "AI_QUOTA_EXCEEDED"
            : rateLimited
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
