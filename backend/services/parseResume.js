const fs = require('fs');
const pdfParse = require("pdf-parse-new");
const askAI = require("../config/aiClient");

const parseJsonFromResponse = (raw) => {
    const cleanJsonString = String(raw || "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleanJsonString);
    } catch (error) {
        const jsonMatch = cleanJsonString.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw error;
        return JSON.parse(jsonMatch[0]);
    }
};

const hasFormalExperienceSection = (resumeText) => {
    const sectionHeadingPattern = /(^|\n)\s*(work experience|professional experience|experience|internship|internships)\s*(\n|$)/i;
    return sectionHeadingPattern.test(resumeText);
};

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
	      "email": "",
	      "skills": ["flat list of technical skills only"],
	      "experience": [],
	      "experienceYears": 0,
	      "projects": [
	        {
	          "title": "",
	          "description": "",
	          "technologies": []
	        }
	      ],
	      "education": [],
	      "tech_stack": ["flat list of frameworks, databases, cloud, tools"]
	    }

	    Extract skills as plain strings, not grouped objects.
	    Count only professional work/internship experience in experienceYears.
	    If the resume only has academic projects and no work experience, use 0 for experienceYears.
	    Do not infer professional experience from Summary, Projects, Education, or personal project dates.
	    If there is no explicit Work Experience, Professional Experience, or Internship section, return "experience": [] and "experienceYears": 0.

    Resume:
    ${resumeText}`;

    const aiResponse = await askAI(prompt);

    try {
        const parsedResume = parseJsonFromResponse(aiResponse);

        if (!hasFormalExperienceSection(resumeText)) {
            parsedResume.experience = [];
            parsedResume.experienceYears = 0;
        }

        parsedResume.rawText = resumeText;

        return JSON.stringify(parsedResume);
    } catch (error) {
        // Let the controller use its existing fallback/extraction path.
    }

    return aiResponse; // Return the AI response, NOT the raw text
};

module.exports = parseResume;
