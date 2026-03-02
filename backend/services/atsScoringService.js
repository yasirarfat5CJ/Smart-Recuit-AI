const askAI = require("../config/aiClient");

const calculateATSScore = async (candidate, job) => {

  let score = 0;

  // Normalize skills
  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const jobSkills = (job.requiredSkills || []).map(s => s.toLowerCase());

 
  const matchedSkills = candidateSkills.filter(skill =>
    jobSkills.includes(skill)
  );

  if (jobSkills.length > 0) {

    const keywordScore = (matchedSkills.length / jobSkills.length) * 30;

    score += keywordScore;

  }

 
  let semanticScore = 0;

  if (candidateSkills.length && jobSkills.length) {

    const semanticPrompt = `
You are an ATS skill matcher.

Find RELATED skills between candidate and job skills.

Candidate Skills: ${candidateSkills.join(",")}
Job Skills: ${jobSkills.join(",")}

IMPORTANT:

- Include similar or equivalent technologies.
- Example: reactjs -> react, node -> nodejs.

Return ONLY comma separated skills.
Example:
react,nodejs,typescript
`;

    const aiResult = await askAI(semanticPrompt);

    let semanticMatches = [];

    if (aiResult) {

      semanticMatches = aiResult
        .toLowerCase()
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    }

    // Remove duplicates
    const uniqueSemanticMatches = [...new Set(semanticMatches)];

    semanticScore = (uniqueSemanticMatches.length / jobSkills.length) * 30;

    score += semanticScore;

  }

 
  const candidateExperience = candidate.experienceYears || 0;
  const requiredExperience = job.minExperienceYears || 0;

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


  if (candidate.projects && candidate.projects.length > 0) {

    score += 15;

  }

 
  score = Math.min(score, 100);

  return Math.round(score);

};

module.exports = calculateATSScore;
