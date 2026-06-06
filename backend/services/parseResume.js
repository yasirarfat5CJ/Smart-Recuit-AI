const fs = require("fs");
const pdfParse = require("pdf-parse-new");
const askAI = require("../config/aiClient");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseJsonFromResponse = (raw) => {
  const cleaned = String(raw || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]); // throws if still invalid
    throw new Error("No valid JSON object found in AI response");
  }
};

const hasFormalExperienceSection = (text) =>
  /(^|\n)\s*(work\s+experience|professional\s+experience|experience|internship[s]?)\s*(\n|$)/i.test(text);

const sectionBetween = (text, start, endLabels) => {
  const pattern = new RegExp(
    `${start}\\s*([\\s\\S]*?)(?=\\n\\s*(?:${endLabels.join("|")})\\s*\\n|$)`,
    "i"
  );
  return text.match(pattern)?.[1]?.trim() || "";
};

const splitBulletBlocks = (text) =>
  String(text || "")
    .split(/\n\s*(?=•|\u2022|- )/g)
    .map((item) => item.replace(/^[•\u2022-]\s*/, "").trim())
    .filter(Boolean);

const parseSkillLines = (skillsText) => {
  const skills = [];
  const techStack = [];

  skillsText.split("\n").forEach((line) => {
    const cleaned = line.replace(/^[•\u2022-]\s*/, "").trim();
    const [, , values = cleaned] = cleaned.match(/^([^:]+):\s*(.+)$/) || [];
    const items = values
      .split(/,|\||\s{2,}/)
      .map((value) => value.trim())
      .filter(Boolean);

    skills.push(...items);

    if (/frontend|backend|database|generative|tools|cloud|fundamentals/i.test(cleaned)) {
      techStack.push(...items);
    }
  });

  return {
    skills: [...new Set(skills)],
    techStack: [...new Set(techStack)]
  };
};

const parseProjects = (projectsText) =>
  splitBulletBlocks(projectsText).map((block) => {
    const lines = block.split("\n").map((line) => line.replace(/^[-–]\s*/, "").trim()).filter(Boolean);
    const firstLine = lines[0] || "";
    const titleMatch = firstLine.match(/^(.+?)(?:\s*\(([^)]+)\))?(?:\s*\[|$)/);
    const technologies = titleMatch?.[2]
      ? titleMatch[2].split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    return {
      title: (titleMatch?.[1] || firstLine).trim(),
      description: lines.slice(1).join(" "),
      technologies
    };
  }).filter((project) => project.title);

const parseEducation = (educationText) =>
  splitBulletBlocks(educationText).map((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
      institution: lines[0] || "",
      degree: lines[1] || "",
      year: block.match(/\b(20\d{2}(?:\s*[–-]\s*(?:20\d{2}|May\s+20\d{2}|\w+))?)/i)?.[0] || ""
    };
  }).filter((item) => item.institution || item.degree);

const buildRawTextFallback = (rawText) => {
  const summary = sectionBetween(rawText, "Summary", ["Education", "Projects", "Technical Skills", "Certifications"]);
  const educationText = sectionBetween(rawText, "Education", ["Projects", "Technical Skills", "Certifications"]);
  const projectsText = sectionBetween(rawText, "Projects", ["Technical Skills", "Certifications", "Experience"]);
  const skillsText = sectionBetween(rawText, "Technical Skills", ["Certifications", "Projects", "Education"]);
  const parsedSkills = parseSkillLines(skillsText);

  return {
    name: rawText.split("\n").map((line) => line.trim()).find(Boolean) || "",
    email: rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "",
    phone: rawText.match(/(?:\+?\d[\d\s-]{8,}\d)/)?.[0]?.trim() || "",
    summary,
    ...parsedSkills,
    experience: [],
    experienceYears: 0,
    projects: parseProjects(projectsText),
    education: parseEducation(educationText)
  };
};

/**
 * Normalise the AI-parsed object into a consistent shape.
 * - camelCase `techStack` (drop `tech_stack`)
 * - all collection fields are arrays
 * - experienceYears is a number
 * NOTE: rawText is intentionally kept on the object so the caller (controller)
 * can pass it to the ATS scorer. The controller removes it before DB save.
 */
const normaliseFields = (obj, rawText) => {
  // Merge tech_stack → techStack
  if (!Array.isArray(obj.techStack) || obj.techStack.length === 0) {
    obj.techStack = Array.isArray(obj.tech_stack) ? obj.tech_stack : [];
  }
  delete obj.tech_stack;

  const ensureArray = (key) => {
    if (!Array.isArray(obj[key])) obj[key] = [];
  };
  ["skills", "techStack", "experience", "projects", "education"].forEach(ensureArray);

  if (!Number.isFinite(Number(obj.experienceYears))) obj.experienceYears = 0;

  // Attach rawText so ATS scoring can use full-text matching in-memory.
  // The controller strips this before persisting to MongoDB.
  obj.rawText = rawText;

  return obj;
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parses a PDF resume and returns a normalised plain JS object.
 * Throws on unrecoverable failure — the controller applies its fallback.
 *
 * The returned object includes `rawText` for ATS scoring.
 * Callers MUST delete `obj.rawText` before saving to the database.
 */
const parseResume = async (filepath) => {
  // ── 1. Extract text ───────────────────────────────────────────────────────
  const buffer = fs.readFileSync(filepath);
  const { text: rawText } = await pdfParse(buffer);

  if (!rawText || !rawText.trim()) {
    throw new Error("PDF appears to be empty or unreadable");
  }

  // ── 2. Ask AI ─────────────────────────────────────────────────────────────
  const prompt = `
You are an AI resume parser. Extract structured information from the resume below.

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no prose.
2. Use the exact field names shown below.
3. skills and techStack must be flat arrays of plain strings.
4. Count only paid work / internships in experienceYears.
5. If there is no explicit "Work Experience", "Professional Experience", or "Internship" section, set experience to [] and experienceYears to 0.

FORMAT:
{
  "name": "",
  "email": "",
  "phone": "",
  "summary": "",
  "skills": ["flat list of technical skills"],
  "techStack": ["frameworks, databases, cloud tools, libraries"],
  "experience": [
    { "company": "", "role": "", "duration": "", "description": "" }
  ],
  "experienceYears": 0,
  "projects": [
    { "title": "", "description": "", "technologies": [] }
  ],
  "education": [
    { "institution": "", "degree": "", "year": "" }
  ]
}

RESUME:
${rawText}
`.trim();

  let aiResponse = "";
  try {
    aiResponse = await askAI(prompt);
  } catch (error) {
    console.warn("[parseResume] AI parse failed, continuing with raw text:", error.message);
  }

  // ── 3. Parse AI response ───────────────────────────────────────────────────
  let parsed = {};
  try {
    if (aiResponse && String(aiResponse).trim()) {
      parsed = parseJsonFromResponse(aiResponse);
    }
  } catch (jsonErr) {
    // Keep the raw resume text available for ATS scoring even if structured
    // parsing fails. This prevents repeat uploads from collapsing to only the
    // default experience score when the model returns malformed JSON.
    console.error("[parseResume] JSON extraction failed:", jsonErr.message);
    console.error("[parseResume] AI response (first 500 chars):", String(aiResponse).slice(0, 500));
    parsed = {};
  }

  const fallbackParsed = buildRawTextFallback(rawText);
  parsed = {
    ...fallbackParsed,
    ...parsed,
    skills: Array.isArray(parsed.skills) && parsed.skills.length ? parsed.skills : fallbackParsed.skills,
    techStack: Array.isArray(parsed.techStack) && parsed.techStack.length ? parsed.techStack : fallbackParsed.techStack,
    projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : fallbackParsed.projects,
    education: Array.isArray(parsed.education) && parsed.education.length ? parsed.education : fallbackParsed.education,
    summary: parsed.summary || fallbackParsed.summary,
    name: parsed.name || fallbackParsed.name,
    email: parsed.email || fallbackParsed.email,
    phone: parsed.phone || fallbackParsed.phone
  };

  // ── 4. Business-rule overrides ─────────────────────────────────────────────
  if (!hasFormalExperienceSection(rawText)) {
    parsed.experience = [];
    parsed.experienceYears = 0;
  }

  // ── 5. Normalise and return ────────────────────────────────────────────────
  return normaliseFields(parsed, rawText);
};

module.exports = parseResume;
