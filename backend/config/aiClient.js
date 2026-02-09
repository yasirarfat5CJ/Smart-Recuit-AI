const { GoogleGenAI } = require("@google/genai");

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

console.log("API KEY:", process.env.GEMINI_API_KEY);


const formatMessagesForGemini = (messages) => {

  return messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

};

const askAI = async (prompt) => {

  try {

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

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents
    });

    return response.text;

  } catch (error) {

    console.error("Gemini Error:", error.message);
    throw new Error("AI request failed");

  }
};

module.exports = askAI;
