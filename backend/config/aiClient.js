const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const textPart = (content) => ({
  text: String(content || "")
});

const normalizeRole = (role) => {
  if (role === "assistant" || role === "model") return "model";
  return "user";
};

const formatMessagesForGemini = (messages) => {
  const systemParts = [];
  const contents = [];

  messages.forEach((message) => {
    const content = String(message?.content || "").trim();
    if (!content) return;

    if (message.role === "system") {
      systemParts.push(textPart(content));
      return;
    }

    contents.push({
      role: normalizeRole(message.role),
      parts: [textPart(content)]
    });
  });

  return {
    contents: contents.length ? contents : [{ role: "user", parts: [textPart("")] }],
    systemInstruction: systemParts.length ? { parts: systemParts } : undefined
  };
};

const buildGeminiPayload = (prompt) => {
  if (Array.isArray(prompt)) {
    return formatMessagesForGemini(prompt);
  }

  return {
    contents: [
      {
        role: "user",
        parts: [textPart(prompt)]
      }
    ]
  };
};

const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
};

const getStatusCode = (error) =>
  Number(String(error?.message || "").match(/^(\d{3})/)?.[1]);

const isQuotaExceeded = (status, message) =>
  status === 429 || /quota|rate limit|resource exhausted/i.test(message);

const isNetworkFailure = (error) => {
  const message = String(error?.message || "");
  return (
    message.includes("fetch failed") ||
    message.includes("ECONNRESET") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT")
  );
};

const askAI = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const maxAttempts = 3;
  let delay = 800;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          ...buildGeminiPayload(prompt),
          generationConfig: {
            temperature: 0.2
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`${response.status} ${data?.error?.message || response.statusText}`);
      }

      return extractGeminiText(data);
    } catch (error) {
      console.error("Gemini Error:", error.message);

      const message = String(error?.message || "");
      const status = getStatusCode(error);
      const quotaExceeded = isQuotaExceeded(status, message);
      const networkFailure = isNetworkFailure(error);
      const retryable = quotaExceeded || networkFailure;
      const isLast = attempt === maxAttempts;

      if (!retryable || isLast) {
        const finalError = new Error(
          quotaExceeded
            ? "AI_QUOTA_EXCEEDED"
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
