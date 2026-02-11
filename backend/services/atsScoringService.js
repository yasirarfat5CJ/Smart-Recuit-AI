const askAI = require("../config/aiClient");

const calculateATSScore = async (candidate, job) => {

  let score = 0;

  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const jobSkills = (job.requiredSkills || []).map(s => s.toLowerCase());

  
  const matchedSkills = candidateSkills.filter(skill =>
    jobSkills.includes(skill)
  );

  if (jobSkills.length > 0) {

    const keywordScore = (matchedSkills.length / jobSkills.length) * 30;

    score += keywordScore;

  }

  
  const semanticPrompt = `
Compare candidate skills with job skills.

Candidate Skills: ${candidateSkills.join(",")}
Job Skills: ${jobSkills.join(",")}

Return ONLY comma separated RELATED skills from candidate matching job context.
Example: react,nodejs,typescript
`;

  const aiResult = await askAI(semanticPrompt);

  let semanticMatches = [];

  if (aiResult) {
    semanticMatches = aiResult
      .toLowerCase()
      .split(",")
      .map(s => s.trim());
  }

  const uniqueSemanticMatches = semanticMatches.filter(skill =>
    jobSkills.includes(skill)
  );

  if (jobSkills.length > 0) {

    const semanticScore = (uniqueSemanticMatches.length / jobSkills.length) * 30;

    score += semanticScore;

  }



  const candidateExperience = candidate.experienceYears || 0;
  const requiredExperience = job.minExperienceYears || 0;

  if (candidateExperience >= requiredExperience) {

    score += 25;

  } else {

    score += (candidateExperience / requiredExperience) * 25;

  }

 
  if (candidate.projects && candidate.projects.length > 0) {

    score += 15;

  }

  return Math.round(score);

};

module.exports = calculateATSScore;
