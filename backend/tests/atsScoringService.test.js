const test = require("node:test");
const assert = require("node:assert/strict");
const calculateATSScore = require("../services/atsScoringService");

test("scores a complete student resume and returns a category breakdown", () => {
  const result = calculateATSScore({
    name: "Student Name",
    email: "student@example.com",
    phone: "1234567890",
    summary: "Software engineering student focused on building reliable full-stack applications.",
    rawText: "resume text",
    skills: ["JavaScript", "React", "Node.js", "MongoDB", "Git", "REST APIs"],
    projects: [
      {
        title: "Interview Prep",
        description: "Built a resume-driven interview practice platform with authentication and live AI questions.",
        technologies: ["React", "Node.js"]
      },
      {
        title: "Study Planner",
        description: "Created a planning application with reminders, progress tracking, and responsive dashboards.",
        technologies: ["React", "MongoDB"]
      }
    ],
    education: [{ degree: "B.Tech", institution: "Example University", year: "2026" }],
    experience: []
  });

  assert.equal(result.score, 72);
  assert.deepEqual(result.breakdown, {
    skills: 18,
    projects: 24,
    education: 15,
    experience: 0,
    completeness: 15
  });
  assert.equal(result.suggestions.length, 0);
});

test("returns actionable suggestions for a sparse resume", () => {
  const result = calculateATSScore({ name: "Student", email: "student@example.com" });

  assert.ok(result.score < 30);
  assert.ok(result.suggestions.length >= 3);
});

test("scores resume against a job description and returns semantic match details", () => {
  const result = calculateATSScore(
    {
      name: "Student Name",
      email: "student@example.com",
      phone: "1234567890",
      summary: "Full-stack developer working with React, Node.js, MongoDB, REST APIs, Docker, and Git.",
      rawText: "Built MERN applications with React.js, Node.js, MongoDB, REST APIs, Docker, Git, JWT authentication and deployment.",
      skills: ["React.js", "Node.js", "MongoDB", "REST APIs", "Docker", "Git"],
      projects: [
        {
          title: "Interview Prep AI",
          description: "Built a MERN interview platform using React, Node.js, MongoDB, REST APIs, JWT authentication, Docker, and Git workflows.",
          technologies: ["React", "Node.js", "MongoDB", "Docker"]
        }
      ],
      education: [{ degree: "B.Tech Computer Science", institution: "Example University", year: "2026" }]
    },
    {
      mode: "jd",
      jobDescription: "We need a full stack developer with React.js, Node.js, MongoDB, REST API development, Docker, Git, JWT authentication, database design, and deployment experience."
    }
  );

  assert.ok(result.score > 60);
  assert.ok(result.breakdown.jdSkillMatch > 0);
  assert.ok(result.matchDetails.matchedTerms.includes("react"));
  assert.ok(Array.isArray(result.matchDetails.missingTerms));
});
