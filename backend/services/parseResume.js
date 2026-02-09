const fs = require('fs');
const pdfParse = require("pdf-parse-new");
const askAI = require("../config/aiClient");

const parseResume = async (filepath) => {
    // Step 1: Extract PDF
    const databuffer = fs.readFileSync(filepath);
    const data = await pdfParse(databuffer);
    const resumeText = data.text; // Store this for the prompt

    // Step 2: Sending to AI for structured parsing
    const prompt = `
    You are an AI resume parser.
    Extract structured information from this resume.
    
    IMPORTANT RULES:
    1. Return ONLY valid JSON.
    2. Do NOT add explanations or markdown.
    
    Format:
    {
      "name": "",
      "skills": [],
      "experience": [],
      "projects": [],
      "education": [],
      "tech_stack": []
    }

    Resume:
    ${resumeText}`;

    const aiResponse = await askAI(prompt);

    return aiResponse; // Return the AI response, NOT the raw text
};

module.exports = parseResume;