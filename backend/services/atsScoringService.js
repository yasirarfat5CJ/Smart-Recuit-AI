const textLength = (value) => String(value || "").trim().length;

const asArray = (value) => (Array.isArray(value) ? value : []);

const uniqueStrings = (values) => [
  ...new Set(
    values
      .flat(Infinity)
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  )
];

const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "to", "of", "in", "on", "for", "with", "as", "by", "is", "are", "be", "this", "that",
  "from", "at", "it", "you", "your", "we", "our", "will", "can", "should", "must", "have", "has", "using", "use",
  "role", "candidate", "work", "team", "good", "strong", "basic", "knowledge", "experience", "skills", "skill",
  "responsibilities", "requirements", "required", "preferred", "plus", "ability", "understanding", "familiarity"
]);

const SKILL_ALIASES = {
  javascript: ["javascript", "js", "ecmascript"],
  typescript: ["typescript", "ts"],
  react: ["react", "reactjs", "react.js"],
  node: ["node", "nodejs", "node.js"],
  express: ["express", "expressjs", "express.js"],
  mongodb: ["mongodb", "mongo", "mongoose"],
  sql: ["sql", "mysql", "postgresql", "postgres", "rdbms"],
  java: ["java", "core java"],
  python: ["python", "py"],
  docker: ["docker", "containerization", "containers"],
  git: ["git", "github", "version control"],
  rest: ["rest", "rest api", "restful", "api"],
  html: ["html", "html5"],
  css: ["css", "css3", "tailwind", "bootstrap"],
  dsa: ["dsa", "data structures", "algorithms"],
  dbms: ["dbms", "database", "databases"],
  os: ["os", "operating system", "operating systems"],
  oops: ["oops", "oop", "object oriented", "object-oriented"],
  ai: ["ai", "artificial intelligence", "machine learning", "ml", "gemini", "openai", "llm"],
  auth: ["auth", "authentication", "authorization", "jwt"],
  socket: ["socket", "socket.io", "websocket", "websockets"]
};

const tokenize = (value = "") => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9+#.]+/g, " ")
  .split(/\s+/)
  .map((token) => token.trim())
  .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

const normalizeTerm = (value) => {
  const term = String(value || "").toLowerCase().trim();
  const compact = term.replace(/[^a-z0-9+#.]+/g, " ");

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => compact === alias || compact.includes(alias))) return canonical;
  }

  return compact;
};

const normalizeSearchText = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9+#.]+/g, " ");

const flattenResumeText = (resume = {}) => [
  resume.rawText,
  resume.summary,
  resume.skills,
  resume.techStack,
  resume.tech_stack,
  asArray(resume.projects).map((project) => typeof project === "string"
    ? project
    : [project?.title, project?.name, project?.description, project?.technologies, project?.techStack, project?.tech].flat().join(" ")),
  asArray(resume.experience).map((item) => typeof item === "string"
    ? item
    : [item?.role, item?.title, item?.company, item?.description].join(" ")),
  asArray(resume.education).map((item) => typeof item === "string"
    ? item
    : [item?.degree, item?.institution, item?.year].join(" "))
].flat(Infinity).filter(Boolean).join(" ");

const extractJdTerms = (jobDescription = "") => {
  const tokens = tokenize(jobDescription).map(normalizeTerm);
  const counts = tokens.reduce((map, token) => {
    if (!token || STOP_WORDS.has(token)) return map;
    map.set(token, (map.get(token) || 0) + 1);
    return map;
  }, new Map());

  const aliasTerms = Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => String(jobDescription).toLowerCase().includes(alias)))
    .map(([canonical]) => canonical);

  return uniqueStrings([
    aliasTerms,
    [...counts.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 24)
      .map(([term]) => term)
  ]);
};

const termAppearsInText = (term, text) => {
  const normalizedText = normalizeSearchText(text);
  const aliases = SKILL_ALIASES[term] || [term];
  return aliases.some((alias) => normalizedText.includes(alias));
};

const countEvidence = (items, jdTerms) => asArray(items).filter((item) => {
  const text = typeof item === "string" ? item : JSON.stringify(item || {});
  return jdTerms.some((term) => termAppearsInText(term, text));
}).length;

const projectHasDetails = (project) => {
  if (typeof project === "string") return textLength(project) >= 40;
  if (!project || typeof project !== "object") return false;

  return textLength(project.title || project.name) >= 2 &&
    textLength(project.description) >= 40 &&
    uniqueStrings([project.technologies, project.techStack, project.tech]).length > 0;
};

const experienceHasDetails = (item) => {
  if (typeof item === "string") return textLength(item) >= 40;
  if (!item || typeof item !== "object") return false;

  return textLength(item.role || item.title) >= 2 &&
    textLength(item.company) >= 2 &&
    textLength(item.description) >= 30;
};

const calculateNormalATSScore = (resume = {}) => {
  const skills = uniqueStrings([resume.skills, resume.techStack, resume.tech_stack]);
  const projects = asArray(resume.projects);
  const education = asArray(resume.education);
  const experience = asArray(resume.experience);

  const detailedProjects = projects.filter(projectHasDetails).length;
  const detailedExperience = experience.filter(experienceHasDetails).length;
  const contactFields = [resume.name, resume.email, resume.phone].filter((value) => textLength(value) > 0).length;
  const summaryPresent = textLength(resume.summary) >= 40;

  const breakdown = {
    skills: Math.min(30, skills.length * 3),
    projects: Math.min(30, projects.length * 6 + detailedProjects * 6),
    education: Math.min(15, education.length * 10 + (education.some((item) => textLength(item?.degree) > 0) ? 5 : 0)),
    experience: Math.min(10, experience.length * 3 + detailedExperience * 4),
    completeness: Math.min(15, contactFields * 3 + (summaryPresent ? 4 : 0) + (resume.rawText ? 2 : 0))
  };

  const suggestions = [];

  if (skills.length < 6) suggestions.push("Add a focused technical skills section with the tools you can confidently discuss.");
  if (projects.length < 2) suggestions.push("Include at least two relevant projects with your contribution, technology choices, and outcome.");
  if (projects.length && detailedProjects < projects.length) suggestions.push("Strengthen project descriptions with measurable results and the technologies used.");
  if (!education.length) suggestions.push("Add your education, degree, institution, and graduation year.");
  if (!summaryPresent) suggestions.push("Add a short professional summary tailored to the kind of role you are preparing for.");
  if (!resume.phone) suggestions.push("Add a phone number so your contact section is complete.");

  const score = Math.min(100, Object.values(breakdown).reduce((total, value) => total + value, 0));

  return {
    score: Math.round(score),
    breakdown,
    suggestions: suggestions.slice(0, 4)
  };
};

const calculateJdATSScore = (resume = {}, jobDescription = "") => {
  const jdTerms = extractJdTerms(jobDescription);
  const resumeText = flattenResumeText(resume);
  const resumeSkills = uniqueStrings([resume.skills, resume.techStack, resume.tech_stack]).map(normalizeTerm);
  const resumeSkillSet = new Set(resumeSkills);
  const matchedTerms = jdTerms.filter((term) => resumeSkillSet.has(term) || termAppearsInText(term, resumeText));
  const missingTerms = jdTerms.filter((term) => !matchedTerms.includes(term));
  const skillMatches = jdTerms.filter((term) => resumeSkillSet.has(term));
  const projectEvidence = countEvidence(resume.projects, jdTerms);
  const experienceEvidence = countEvidence(resume.experience, jdTerms);
  const educationEvidence = countEvidence(resume.education, jdTerms);
  const normalScore = calculateNormalATSScore(resume);

  const matchRatio = jdTerms.length ? matchedTerms.length / jdTerms.length : 0;
  const skillRatio = jdTerms.length ? skillMatches.length / jdTerms.length : 0;
  const projectRatio = Math.min(1, projectEvidence / 2);
  const experienceRatio = Math.min(1, (experienceEvidence + educationEvidence) / 2);

  const breakdown = {
    jdSkillMatch: Math.round(skillRatio * 35),
    jdKeywordCoverage: Math.round(matchRatio * 25),
    projectEvidence: Math.round(projectRatio * 20),
    experienceEducation: Math.round(experienceRatio * 10),
    resumeQuality: Math.round((normalScore.score / 100) * 10)
  };

  const suggestions = [];
  if (missingTerms.length) suggestions.push(`Add truthful evidence for JD keywords: ${missingTerms.slice(0, 6).join(", ")}.`);
  if (skillRatio < 0.45) suggestions.push("Move matching tools and concepts into a clear skills section using the same wording as the JD.");
  if (projectEvidence < 2) suggestions.push("Add project bullets that show where you used the JD technologies, responsibilities, or domain concepts.");
  if (experienceEvidence + educationEvidence === 0) suggestions.push("Connect internships, training, coursework, or certifications to the JD requirements.");

  const score = Math.min(100, Object.values(breakdown).reduce((total, value) => total + value, 0));

  return {
    score: Math.round(score),
    breakdown,
    suggestions: suggestions.slice(0, 4),
    matchDetails: {
      matchedTerms: matchedTerms.slice(0, 12),
      missingTerms: missingTerms.slice(0, 12),
      jdTerms: jdTerms.slice(0, 18)
    }
  };
};

const calculateATSScore = (resume = {}, options = {}) => {
  const mode = options.mode === "jd" ? "jd" : "normal";
  if (mode === "jd") return calculateJdATSScore(resume, options.jobDescription);
  return calculateNormalATSScore(resume);
};

module.exports = calculateATSScore;
