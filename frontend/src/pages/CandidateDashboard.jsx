import { ArrowRight, Binary, BriefcaseBusiness, Code2, FileUp, FolderKanban, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStudentDashboard, getStudentResume } from "../services/api";

const modes = [
  { id: "project", title: "Project interview", description: "Architecture, implementation choices, challenges, and your contribution.", icon: <FolderKanban size={25} />, accent: "text-amber-600" },
  { id: "technical", title: "Technical interview", description: "Questions grounded in the skills and technologies listed on your resume.", icon: <Code2 size={25} />, accent: "text-emerald-600" },
  { id: "hr", title: "HR interview", description: "Behavioral questions connected to your education, experience, and projects.", icon: <BriefcaseBusiness size={25} />, accent: "text-rose-600" }
];

export default function CandidateDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = id ? await getStudentResume(id) : await getStudentDashboard();
        setData(id ? { latestResume: response.data, uploadCount: 1, interviewHistory: response.data.interviewHistory } : response.data);
      } catch (loadError) {
        setError(loadError?.response?.data?.message || "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <main className="page-shell"><p>Loading your preparation workspace...</p></main>;
  if (error) return <main className="page-shell"><div className="error-banner">{error}</div></main>;

  const resume = data?.latestResume;

  if (!resume) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-2xl py-16 text-center">
          <FileUp className="mx-auto text-emerald-600" size={38} />
          <h1 className="mt-5 text-3xl font-bold">Start with your resume</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Upload a PDF to generate your ATS breakdown and unlock resume-based practice modes.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate("/upload")} className="primary-button">Upload resume <ArrowRight size={18} /></button>
            <button onClick={() => navigate("/dsa")} className="secondary-button"><Binary size={18} /> DSA practice</button>
          </div>
        </div>
      </main>
    );
  }

  const startMode = (mode) => navigate(`/interview/${resume._id}?type=${mode}`);

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="section-label">Preparation dashboard</p>
            <h1 className="page-title">Welcome back{resume.name ? `, ${resume.name.split(" ")[0]}` : ""}</h1>
            <p className="page-copy">Choose a focused practice mode. Every question stays tied to your latest resume.</p>
          </div>
          <button onClick={() => navigate("/upload")} className="secondary-button"><FileUp size={17} /> Update resume</button>
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="surface p-6">
            <p className="text-sm font-medium text-slate-500">ATS readiness</p>
            <p className="mt-2 text-5xl font-bold text-emerald-600">{resume.atsScore}</p>
            <p className="mt-1 text-sm text-slate-500">out of 100</p>
            <p className="mt-6 text-xs text-slate-500">{data.uploadCount} resume upload{data.uploadCount === 1 ? "" : "s"}</p>
          </div>
          <div className="surface grid gap-px overflow-hidden bg-slate-200 dark:bg-slate-700 sm:grid-cols-5">
            {Object.entries(resume.atsBreakdown || {}).map(([label, value]) => (
              <div key={label} className="bg-white p-5 dark:bg-slate-900">
                <p className="text-xs capitalize text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Choose your interview</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {modes.map(({ id: modeId, title, description, icon, accent }) => (
              <button key={modeId} onClick={() => startMode(modeId)} className="surface group p-6 text-left transition hover:border-slate-400 dark:hover:border-slate-600">
                <div className={accent}>{icon}</div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Start practice <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 surface p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Binary size={22} />
                <span className="text-sm font-semibold">DSA preparation</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">Practice 100 common DSA problems topic-wise</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Open curated LeetCode and GeeksforGeeks questions by topic, pattern, platform, and difficulty.
              </p>
            </div>
            <button onClick={() => navigate("/dsa")} className="primary-button justify-center">
              Open DSA sheet <ArrowRight size={17} />
            </button>
          </div>
        </section>

        <section className="mt-10 surface">
          <div className="flex items-center gap-2 border-b border-slate-200 p-5 dark:border-slate-700"><History size={19} /><h2 className="font-semibold">Recent practice</h2></div>
          {!data.interviewHistory?.length ? (
            <p className="p-6 text-sm text-slate-500">Your completed interviews will appear here.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.interviewHistory.slice(0, 6).map((session) => (
                <div key={session._id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div><p className="font-medium capitalize">{session.interviewType} interview</p><p className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleDateString()}</p></div>
                  <span className="text-sm text-slate-500 capitalize">{session.status}</span>
                  <span className="font-semibold">{session.totalScore || 0}/100</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
