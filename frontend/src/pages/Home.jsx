import { ArrowRight, FileSearch, FolderKanban, MessagesSquare, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Home() {
  const { userId } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 pt-16 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Resume-led interview preparation</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Practice the questions your resume is likely to create.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Upload your resume, understand its ATS readiness, and run focused project, technical, or HR practice interviews with AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={userId ? "/upload" : "/register"} className="primary-button">
                {userId ? "Analyze resume" : "Start preparing"} <ArrowRight size={18} />
              </Link>
              {userId && <Link to="/dashboard" className="secondary-button">Open dashboard</Link>}
              {!userId && <Link to="/login" className="secondary-button">Sign in</Link>}
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold">Resume readiness</p>
                <p className="text-xs text-slate-500">Category-level feedback</p>
              </div>
              <span className="text-3xl font-bold text-emerald-600">78</span>
            </div>
            <div className="space-y-4 py-5">
              {[
                ["Skills", 24, "30"],
                ["Projects", 23, "30"],
                ["Education", 15, "15"],
                ["Completeness", 11, "15"]
              ].map(([label, value, max]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/{max}</span></div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700"><div className="h-full bg-emerald-600" style={{ width: `${(value / Number(max)) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 text-center text-xs dark:border-slate-700">
              <span className="bg-white p-3 dark:bg-slate-800">Projects</span>
              <span className="bg-white p-3 dark:bg-slate-800">Technical</span>
              <span className="bg-white p-3 dark:bg-slate-800">HR</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 md:grid-cols-4">
          {[
            [<FileSearch size={24} />, "ATS breakdown", "See how skills, projects, education, experience, and completeness affect your score."],
            [<FolderKanban size={24} />, "Project deep dives", "Explain architecture, decisions, tradeoffs, debugging, and your exact contribution."],
            [<MessagesSquare size={24} />, "Technical and HR", "Choose the practice mode you need without questions drifting beyond your resume."],
            [<Mic size={24} />, "Voice answers", "Speak naturally, review the transcript, then send the answer for evaluation."]
          ].map(([icon, title, description]) => (
            <article key={title} className="bg-white p-6 dark:bg-slate-900">
              <div className="mb-5 text-emerald-600">{icon}</div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
