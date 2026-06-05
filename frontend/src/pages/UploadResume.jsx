import { AlertCircle, ArrowRight, CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../services/api";

const labels = {
  skills: ["Skills", 30],
  projects: ["Projects", 30],
  education: ["Education", 15],
  experience: ["Experience", 10],
  completeness: ["Completeness", 15]
};

export default function UploadResume() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectFile = (picked) => {
    if (!picked) return;
    if (picked.type !== "application/pdf") {
      setError("Please choose a PDF resume.");
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setError("The PDF must be 5 MB or smaller.");
      return;
    }
    setError("");
    setFile(picked);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return setError("Choose a resume before continuing.");

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("resume", file);
      const response = await uploadResume(formData);
      setResult(response.data);
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || "Resume analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="section-label">Resume analysis</p>
          <h1 className="page-title">Build your interview baseline</h1>
          <p className="page-copy">Your score reflects resume quality and interview readiness, not a comparison with a job posting.</p>
        </div>

        {!result ? (
          <form onSubmit={submit} className="surface max-w-3xl p-6 sm:p-8">
            <label
              htmlFor="resume"
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
              className={`grid min-h-72 cursor-pointer place-items-center border-2 border-dashed p-8 text-center transition ${dragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-300 dark:border-slate-700"}`}
            >
              <div>
                <UploadCloud className="mx-auto mb-5 text-emerald-600" size={38} />
                <p className="font-semibold">Drop your PDF resume here</p>
                <p className="mt-2 text-sm text-slate-500">or click to browse, up to 5 MB</p>
                {file && (
                  <span className="mt-5 inline-flex items-center gap-2 bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                    <FileText size={16} /> {file.name}
                  </span>
                )}
              </div>
            </label>
            <input id="resume" type="file" accept="application/pdf" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
            {error && <div className="error-banner mt-4"><AlertCircle size={17} /> {error}</div>}
            <button disabled={loading || !file} className="primary-button mt-5 w-full justify-center">
              {loading ? "Reading and scoring resume..." : "Analyze resume"}
            </button>
          </form>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <section className="surface p-6 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
              <p className="mt-3 text-sm font-medium text-slate-500">ATS readiness score</p>
              <p className="mt-2 text-6xl font-bold">{result.candidate.atsScore}</p>
              <p className="mt-2 text-sm text-slate-500">out of 100</p>
              <button onClick={() => navigate("/dashboard")} className="primary-button mt-6 w-full justify-center">
                Continue <ArrowRight size={17} />
              </button>
            </section>
            <section className="surface p-6">
              <h2 className="text-lg font-semibold">Score breakdown</h2>
              <div className="mt-5 space-y-4">
                {Object.entries(labels).map(([key, [label, max]]) => {
                  const value = result.atsBreakdown?.[key] || 0;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span>{value}/{max}</span></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700"><div className="h-full bg-emerald-600" style={{ width: `${(value / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              {!!result.atsSuggestions?.length && (
                <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-700">
                  <h3 className="font-semibold">Improve next</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {result.atsSuggestions.map((suggestion) => <li key={suggestion}>• {suggestion}</li>)}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
