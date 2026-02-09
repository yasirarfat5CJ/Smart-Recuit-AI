const askAI = require("../config/aiClient");

const calculateATSScore = async (candidate, job) => {

  let score = 0;

  const candidateSkills = candidate.skills || [];
  const jobSkills = job.requiredSkills || [];


  const matchedSkills = candidateSkills.filter(skill =>
    jobSkills.includes(skill)
  );

  if (jobSkills.length > 0) {
    score += (matchedSkills.length / jobSkills.length) * 40;
  }

 

  const semanticPrompt = `
Compare these skills:

Candidate Skills: ${candidateSkills.join(",")}
Job Skills: ${jobSkills.join(",")}

Return ONLY a number between 0 and 30 representing semantic similarity score.
`;

  const aiResult = await askAI(semanticPrompt);

  const semanticScore = parseInt(aiResult) || 0;

  score += semanticScore;


  const experienceYears = candidate.experience?.length || 0;

  if (experienceYears >= job.minExperienceYears) {
    score += 20;
  }

  

  if (candidate.projects?.length > 0) {
    score += 10;
  }

  return Math.round(score);
};

module.exports = calculateATSScore;
