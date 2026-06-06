import { ArrowUpRight, BookOpen, Filter, Search, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { allDsaQuestions, dsaTopics } from "../data/dsaQuestions";

const difficultyClasses = {
  Easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Hard: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
};

const platformClasses = {
  LeetCode: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
  GFG: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
};

export default function DSAPrep() {
  const [activeTopic, setActiveTopic] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [query, setQuery] = useState("");

  const filteredQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allDsaQuestions.filter((question) => {
      const matchesTopic = activeTopic === "all" || question.topicId === activeTopic;
      const matchesPlatform = platform === "all" || question.platform === platform;
      const matchesQuery = !normalizedQuery ||
        `${question.title} ${question.pattern} ${question.topicName}`.toLowerCase().includes(normalizedQuery);

      return matchesTopic && matchesPlatform && matchesQuery;
    });
  }, [activeTopic, platform, query]);

  const activeTopicData = dsaTopics.find((topic) => topic.id === activeTopic);
  const totals = {
    topics: dsaTopics.length,
    questions: allDsaQuestions.length,
    leetcode: allDsaQuestions.filter((question) => question.platform === "LeetCode").length,
    gfg: allDsaQuestions.filter((question) => question.platform === "GFG").length
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="section-label">DSA preparation</p>
            <h1 className="page-title">Topic-wise interview questions</h1>
            <p className="page-copy">
              Practice the most relevant DSA patterns from LeetCode and GeeksforGeeks. Open any question directly on its platform.
            </p>
          </div>

          <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-slate-200 dark:bg-slate-700">
            <Stat label="Topics" value={totals.topics} />
            <Stat label="Questions" value={totals.questions} />
            <Stat label="LeetCode" value={totals.leetcode} />
            <Stat label="GFG" value={totals.gfg} />
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="surface h-fit p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Target size={17} />
              Topics
            </div>
            <div className="space-y-2">
              <TopicButton
                active={activeTopic === "all"}
                title="All topics"
                subtitle={`${allDsaQuestions.length} questions`}
                onClick={() => setActiveTopic("all")}
              />
              {dsaTopics.map((topic) => (
                <TopicButton
                  key={topic.id}
                  active={activeTopic === topic.id}
                  title={topic.name}
                  subtitle={topic.focus}
                  onClick={() => setActiveTopic(topic.id)}
                />
              ))}
            </div>
          </aside>

          <section>
            <div className="surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search question, pattern, or topic..."
                    className="form-input pl-10"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <Filter size={17} className="text-slate-500" />
                  <select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    className="form-input min-w-36"
                  >
                    <option value="all">All platforms</option>
                    <option value="LeetCode">LeetCode</option>
                    <option value="GFG">GFG</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 surface overflow-hidden">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold">{activeTopicData?.name || "All topics"}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeTopicData?.focus || "A balanced list across core DSA interview areas."}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {filteredQuestions.length} question{filteredQuestions.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No questions match this filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredQuestions.map((question) => (
                    <QuestionRow key={`${question.platform}-${question.title}`} question={question} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white p-4 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function TopicButton({ active, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md border px-3 py-3 text-left transition ${
        active
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</span>
    </button>
  );
}

function QuestionRow({ question }) {
  return (
    <a
      href={question.url}
      target="_blank"
      rel="noreferrer"
      className="grid gap-3 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/70 md:grid-cols-[1fr_auto] md:items-center"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{question.title}</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${difficultyClasses[question.difficulty]}`}>
            {question.difficulty}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${platformClasses[question.platform]}`}>
            {question.platform}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <BookOpen size={15} />
          {question.topicName} - {question.pattern}
        </p>
      </div>

      <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        Open question <ArrowUpRight size={16} />
      </span>
    </a>
  );
}
