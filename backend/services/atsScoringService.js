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

const calculateATSScore = (resume = {}) => {
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

module.exports = calculateATSScore;
