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

  // ── 4. Business-rule overrides ─────────────────────────────────────────────
  if (!hasFormalExperienceSection(rawText)) {
    parsed.experience = [];
    parsed.experienceYears = 0;
  }

  // ── 5. Normalise and return ────────────────────────────────────────────────
  return normaliseFields(parsed, rawText);
};

module.exports = parseResume;
