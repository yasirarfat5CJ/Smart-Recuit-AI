import { AlertCircle, ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Sparkles, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../services/api";

const normalLabels = {
  skills: ["Skills", 30],
  projects: ["Projects", 30],
  education: ["Education", 15],
  experience: ["Experience", 10],
  completeness: ["Completeness", 15]
};

const jdLabels = {
  jdSkillMatch: ["JD skill match", 35],
  jdKeywordCoverage: ["Keyword coverage", 25],
  projectEvidence: ["Project evidence", 20],
  experienceEducation: ["Experience & education", 10],
  resumeQuality: ["Resume quality", 10]
};

export default function UploadResume() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [atsMode, setAtsMode] = useState("normal");
  const [jobDescription, setJobDescription] = useState("");

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
    if (atsMode === "jd" && jobDescription.trim().length < 80) {
      return setError("Paste a job description of at least 80 characters for JD ATS scoring.");
    }

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("atsMode", atsMode);
      if (atsMode === "jd") formData.append("jobDescription", jobDescription.trim());
      const response = await uploadResume(formData);
      setResult(response.data);
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || "Resume analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeLabels = result?.atsMode === "jd" || result?.candidate?.atsMode === "jd" ? jdLabels : normalLabels;
  const matchDetails = result?.atsMatchDetails || result?.candidate?.atsMatchDetails || {};

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="section-label">Resume analysis</p>
          <h1 className="page-title">Build your interview baseline</h1>
          <p className="page-copy">Choose normal ATS for resume quality or JD ATS to compare your resume with a specific job description.</p>
        </div>

        {!result ? (
          <form onSubmit={submit} className="surface max-w-3xl p-6 sm:p-8">
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setAtsMode("normal"); setError(""); }}
                className={`border p-4 text-left transition ${atsMode === "normal" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 hover:border-slate-400 dark:border-slate-700"}`}
              >
                <Sparkles className="text-emerald-600" size={21} />
                <span className="mt-3 block font-semibold">Normal ATS</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">Score skills, projects, education, experience, and completeness without a JD.</span>
              </button>
              <button
                type="button"
                onClick={() => { setAtsMode("jd"); setError(""); }}
                className={`border p-4 text-left transition ${atsMode === "jd" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-slate-200 hover:border-slate-400 dark:border-slate-700"}`}
              >
                <BriefcaseBusiness className="text-emerald-600" size={21} />
                <span className="mt-3 block font-semibold">JD ATS</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">Match your resume against job keywords, skills, and evidence from a pasted JD.</span>
              </button>
            </div>

            {atsMode === "jd" && (
              <label className="mb-6 block">
                <span className="mb-2 block text-sm font-semibold">Job description</span>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  rows={7}
                  placeholder="Paste the full job description here..."
                  className="w-full resize-none border border-slate-300 bg-white p-3 text-sm leading-6 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950"
                />
                <span className="mt-2 block text-xs text-slate-500">{jobDescription.trim().length} characters</span>
              </label>
            )}

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
              {loading ? "Reading and scoring resume..." : atsMode === "jd" ? "Analyze resume with JD" : "Analyze resume"}
            </button>
          </form>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <section className="surface p-6 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
              <p className="mt-3 text-sm font-medium text-slate-500">{result.candidate?.atsMode === "jd" ? "JD ATS match score" : "ATS readiness score"}</p>
              <p className="mt-2 text-6xl font-bold">{result.candidate.atsScore}</p>
              <p className="mt-2 text-sm text-slate-500">out of 100</p>
              <button onClick={() => navigate("/dashboard")} className="primary-button mt-6 w-full justify-center">
                Continue <ArrowRight size={17} />
              </button>
            </section>
            <section className="surface p-6">
              <h2 className="text-lg font-semibold">Score breakdown</h2>
              <div className="mt-5 space-y-4">
                {Object.entries(activeLabels).map(([key, [label, max]]) => {
                  const value = result.atsBreakdown?.[key] || 0;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span>{value}/{max}</span></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700"><div className="h-full bg-emerald-600" style={{ width: `${(value / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              {result.candidate?.atsMode === "jd" && (
                <div className="mt-7 grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-700 sm:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Matched JD terms</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(matchDetails.matchedTerms || []).length
                        ? matchDetails.matchedTerms.map((term) => <span key={term} className="bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{term}</span>)
                        : <span className="text-sm text-slate-500">No strong matches found.</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Missing JD terms</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(matchDetails.missingTerms || []).length
                        ? matchDetails.missingTerms.map((term) => <span key={term} className="bg-rose-50 px-2 py-1 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{term}</span>)
                        : <span className="text-sm text-slate-500">No major missing terms detected.</span>}
                    </div>
                  </div>
                </div>
              )}
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
