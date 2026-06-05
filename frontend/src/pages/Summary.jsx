import { ArrowRight, RotateCcw, Target } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

export default function Summary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const summary = state?.summary;

  if (!summary) return <Navigate to="/dashboard" replace />;

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <p className="section-label">Practice complete</p>
        <h1 className="page-title capitalize">{state.interviewType} interview review</h1>

        <div className="mt-8 grid gap-5 md:grid-cols-[240px_1fr]">
          <section className="surface p-6 text-center">
            <Target className="mx-auto text-emerald-600" size={28} />
            <p className="mt-4 text-6xl font-bold">{Math.round((summary.overallRating || 0) * 10)}</p>
            <p className="mt-1 text-sm text-slate-500">interview score</p>
            <span className="mt-5 inline-block bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{summary.readinessLevel || "Needs Practice"}</span>
          </section>
          <section className="surface divide-y divide-slate-200 dark:divide-slate-700">
            <Review title="What went well" content={summary.strengths} />
            <Review title="Focus areas" content={summary.weaknesses} />
            <Review title="Coach feedback" content={summary.overallFeedback} />
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => navigate(`/interview/${state.candidateId}?type=${state.interviewType}`)} className="secondary-button"><RotateCcw size={17} /> Practice again</button>
          <button onClick={() => navigate("/dashboard")} className="primary-button">Dashboard <ArrowRight size={17} /></button>
        </div>
      </div>
    </main>
  );
}

function Review({ title, content }) {
  return <div className="p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{content || "No feedback available."}</p></div>;
}
