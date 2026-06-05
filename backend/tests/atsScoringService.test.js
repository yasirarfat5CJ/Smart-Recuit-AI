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
