const askAI = require("../config/aiClient");

const normalizeSkill = (skill) =>
  String(skill || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueNormalized = (values = []) => [
  ...new Set(values.map(normalizeSkill).filter(Boolean))
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const flattenValues = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return [value];
};

const expandCompositeSkills = (skills) => {
  const expanded = [...skills];

  skills.forEach((skill) => {
    if (["mern", "mern stack"].includes(skill)) {
      expanded.push("mongodb", "express", "react", "node");
    }

    if (["mean", "mean stack"].includes(skill)) {
      expanded.push("mongodb", "express", "angular", "node");
    }

    if (["generative ai", "gen ai"].includes(skill)) {
      expanded.push("rag", "llm", "llms", "langchain");
    }
  });

  return [...new Set(expanded)];
};

const skillAliases = [
  ["c++", "cpp"],
  ["mern", "mern stack", "mern stack developer"],
  ["mean", "mean stack", "mean stack developer"],
  ["react", "react.js", "reactjs", "react js"],
  ["node", "node.js", "nodejs", "node js"],
  ["express", "express.js", "expressjs", "express js"],
  ["mongodb", "mongo db", "mongo"],
  ["postgresql", "postgres", "postgre sql"],
  ["mysql", "my sql"],
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["html", "html5"],
  ["css", "css3"],
  ["bootstrap", "bootstrap css"],
  ["tailwind", "tailwindcss", "tailwind css"],
  ["next", "nextjs", "next js"],
  ["vue", "vuejs", "vue js"],
  ["angular", "angularjs", "angular js"],
  ["python", "py"],
  ["django", "django rest framework", "drf"],
  ["flask", "flask api"],
  ["java", "core java"],
  ["spring", "spring boot"],
  ["c sharp", "c#", "csharp"],
  ["dotnet", ".net", "asp net", "asp.net"],
  ["aws", "amazon web services"],
  ["gcp", "google cloud", "google cloud platform"],
  ["azure", "microsoft azure"],
  ["azure ai", "azure ai fundamentals"],
  ["docker", "dockerfile"],
  ["kubernetes", "k8s"],
  ["ci cd", "cicd", "continuous integration", "continuous deployment"],
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
  ["large language models", "llm", "llms"],
  ["rag", "retrieval augmented generation"],
  ["langchain", "lang chain"],
  ["faiss", "facebook ai similarity search"],
  ["aws bedrock", "bedrock", "amazon bedrock"],
  ["socket io", "socket.io", "websocket", "websockets"],
  ["jwt", "json web token", "json web tokens"],
  ["git"],
  ["github", "git hub"],
  ["api", "apis", "api integration"],
  ["dsa", "data structures", "data structures and algorithms"],
  ["oops", "oop", "object oriented programming"],
  ["rest", "rest api", "rest apis", "restful api", "restful apis"],
  ["graphql", "graph ql"]
].map((group) => group.map(normalizeSkill));

const knownSkillTerms = [
  ...new Set([
    ...skillAliases.flat(),
    "mern",
    "mern stack",
    "mean",
    "mean stack",
    "generative ai",
    "gen ai"
  ])
].sort((a, b) => b.length - a.length);

const containsSkillTerm = (text, term) => {
  const pattern = new RegExp(`(^|\\s)${escapeRegex(term)}(?=\\s|$)`);
  return pattern.test(text);
};

const splitSkillText = (value) =>
  String(value || "")
    .split(/[,;|/\n]+|\s+-\s+|\s+and\s+|(?<=[a-z])\+(?=[a-z])/i)
    .map(normalizeSkill)
    .filter(Boolean);

const extractKnownSkills = (value) => {
  const normalized = normalizeSkill(value);
  if (!normalized) return [];

  return knownSkillTerms.filter((term) => containsSkillTerm(normalized, term));
};

const buildSkillSet = (value) => {
  const skills = [];

  flattenValues(value).forEach((item) => {
    const rawText = String(item || "");
    const normalized = normalizeSkill(rawText);
    const hasExplicitSeparator = /[,;|/\n]|\s+-\s+|\s+and\s+|(?<=[a-z])\+(?=[a-z])/i.test(rawText);
    const knownSkills = extractKnownSkills(item);

    skills.push(...knownSkills);

    if (hasExplicitSeparator) {
      splitSkillText(item).forEach((part) => {
        const knownPartSkills = extractKnownSkills(part);

        if (knownPartSkills.length) {
          skills.push(...knownPartSkills);
        } else {
          skills.push(part);
        }
      });
    } else if (!knownSkills.length && normalized) {
      skills.push(normalized);
    }
  });

  return expandCompositeSkills(uniqueNormalized(skills));
};

const skillsAreEquivalent = (candidateSkill, jobSkill) => {
  if (candidateSkill === jobSkill) return true;

  return skillAliases.some((group) =>
    group.includes(candidateSkill) && group.includes(jobSkill)
  );
};

const getEquivalentSkillTerms = (skill) => {
  const normalized = normalizeSkill(skill);
  const aliasGroup = skillAliases.find((group) => group.includes(normalized));
  return aliasGroup ? aliasGroup : [normalized];
};

const skillAppearsInText = (skill, text) => {
  const normalizedText = normalizeSkill(text);
  return getEquivalentSkillTerms(skill).some((term) =>
    term && containsSkillTerm(normalizedText, term)
  );
};

const parseJsonFromResponse = (raw) => {
  const cleanJson = String(raw || "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw error;
    return JSON.parse(jsonMatch[0]);
  }
};

const getSemanticMatches = async ({ candidate, job, jobSkills }) => {
  if (!jobSkills.length) return [];

  const resumeEvidence = [
    candidate.rawText,
    candidate.summary,
    candidate.skills,
    candidate.techStack,
    candidate.tech_stack,
    candidate.experience,
    candidate.projects,
    candidate.education
  ]
    .flatMap(flattenValues)
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);

  if (!resumeEvidence.trim()) return [];

  const jobContext = [
    job.title,
    job.description,
    job.requiredSkills,
    job.techStack
  ]
    .flatMap(flattenValues)
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);

  const prompt = `
You are a strict ATS semantic matcher.

Compare the candidate resume evidence against the job requirements.

Rules:
- Return ONLY valid JSON.
- Only match skills from the provided jobSkills array.
- A match must be supported by explicit evidence in the resume.
- Equivalent names count, for example React.js -> React, Node.js -> Node, REST APIs -> API development.
- Do not invent experience or skills.
- Do not give credit for unrelated words.

Job context:
${jobContext}

jobSkills:
${JSON.stringify(jobSkills)}

Resume evidence:
${resumeEvidence}

JSON format:
{
  "matches": [
    {
      "jobSkill": "one exact value from jobSkills",
      "evidence": "short resume evidence"
    }
  ]
}
`;

  try {
    const response = await askAI(prompt);
    const parsed = parseJsonFromResponse(response);
    const matches = Array.isArray(parsed.matches) ? parsed.matches : [];
    const jobSkillSet = new Set(jobSkills);

    return matches
      .map((match) => normalizeSkill(match.jobSkill))
      .filter((skill) => jobSkillSet.has(skill));
  } catch (error) {
    console.log("Semantic ATS fallback used:", error.message);
    return [];
  }
};

const isMeaningfulProject = (project) => {
  if (!project) return false;
  if (typeof project === "string") return project.trim().length >= 20;

  const text = [
    project.title,
    project.name,
    project.description,
    project.techStack,
    project.technologies
  ]
    .flat()
    .filter(Boolean)
    .join(" ");

  return text.trim().length >= 20;
};

const calculateATSScore = async (candidate, job) => {

  let score = 0;

  // Normalize skills
  const candidateSkills = buildSkillSet([
    candidate.skills,
    candidate.techStack,
    candidate.tech_stack,
    candidate.rawText,
    candidate.projects,
    candidate.projects?.map?.((project) => [
      project?.technologies,
      project?.techStack,
      project?.tech,
      project?.title,
      project?.description
    ])
  ]);

  const jobSkills = buildSkillSet([
    job.requiredSkills,
    job.techStack,
    job.title,
    job.description
  ]);

  const matchedJobSkills = new Set();

  jobSkills.forEach((jobSkill) => {
    const matched = candidateSkills.some((candidateSkill) =>
      skillsAreEquivalent(candidateSkill, jobSkill)
    ) || skillAppearsInText(jobSkill, candidate.rawText);

    if (matched) {
      matchedJobSkills.add(jobSkill);
    }
  });

  const semanticMatches = await getSemanticMatches({ candidate, job, jobSkills });
  semanticMatches.forEach((skill) => matchedJobSkills.add(skill));

  if (jobSkills.length > 0) {

    const skillScore = (matchedJobSkills.size / jobSkills.length) * 60;

    score += skillScore;

  }
 
  const candidateExperience = Math.max(0, Number(candidate.experienceYears) || 0);
  const requiredExperience = Math.max(0, Number(job.minExperienceYears) || 0);

  if (requiredExperience === 0) {

    // Fresher role
    score += 25;

  } else if (candidateExperience === 0) {


    score += 12;

  } else if (candidateExperience >= requiredExperience) {

    score += 25;

  } else {

    score += (candidateExperience / requiredExperience) * 25;

  }


  const projectCount = Array.isArray(candidate.projects)
    ? candidate.projects.filter(isMeaningfulProject).length
    : 0;

  if (projectCount > 0) {

    score += projectCount >= 2 ? 15 : 8;

  }

 
  score = Math.min(score, 100);

  return Math.round(score);

};

module.exports = calculateATSScore;
