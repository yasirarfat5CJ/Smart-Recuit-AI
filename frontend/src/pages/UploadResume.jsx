import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadResumeAPI, getJobsAPI } from "../services/api";

export default function UploadResume() {

  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const [atsResult, setAtsResult] = useState(null);
  const [candidateId, setCandidateId] = useState(null);

  useEffect(() => {

    const fetchJobs = async () => {

      try {
        const res = await getJobsAPI();
        setJobs(res.data);
      } catch (err) {
        console.log(err);
      }

    };

    fetchJobs();

  }, []);

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!file || !selectedJob) {
      setError("Please select a job role and upload a PDF resume.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobId", selectedJob);

    try {

      setLoading(true);
      setError("");
      setWarning("");

      const res = await UploadResumeAPI(formData);

      setAtsResult(res.data.candidate.atsScore);
      setCandidateId(res.data.candidate._id);
      if (res.data.fallbackUsed) {
        setWarning("Resume uploaded, but AI parsing was partially unavailable. You can still continue.");
      }

    } catch (error) {

      console.log(error);
      setError(
        error?.response?.data?.message ||
        "Upload failed. Please try again."
      );

    } finally {

      setLoading(false);

    }

  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (dropped.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setError("");
    setFile(dropped);
  };

  const handleFilePick = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    setError("");
    setFile(picked);
  };

  return (

    <div className="min-h-screen px-4 flex justify-center items-center
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <div className="bg-white dark:bg-gray-800
                      p-8 rounded-2xl shadow-lg
                      w-full max-w-2xl">

        <h2 className="text-3xl font-bold mb-6 text-center">
          Upload Resume
        </h2>

        {!atsResult ? (

          <form onSubmit={handleSubmit} className="space-y-5">

            <select
              className="w-full border dark:border-gray-600
                         p-3 rounded
                         bg-white dark:bg-gray-700
                         focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              <option value="">Select Job Role</option>

              {jobs.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.title}
                </option>
              ))}

            </select>

            <label
              htmlFor="resume"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              className={`w-full block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                dragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Drag & drop your resume PDF here or click to browse
              </div>
              {file ? (
                <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400 break-all">
                  Selected: {file.name}
                </div>
              ) : null}
            </label>

            <input
              id="resume"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFilePick}
            />

            {error ? (
              <div className="text-sm rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2">
                {error}
              </div>
            ) : null}

            {warning ? (
              <div className="text-sm rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-3 py-2">
                {warning}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-500
                         hover:bg-blue-700 dark:hover:bg-blue-600
                         text-white w-full py-3 rounded-lg
                         disabled:opacity-70 disabled:cursor-not-allowed
                         transition-all duration-200"
            >
              {loading ? "Analyzing Resume..." : "Upload Resume"}
            </button>

          </form>

        ) : (

          <div className="text-center space-y-5">

            <h3 className="text-xl font-semibold">
              ATS Score
            </h3>

            <div className="mx-auto h-36 w-36 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 text-white grid place-items-center shadow-lg">
              <div className="text-4xl font-bold">{atsResult}</div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Resume parsed successfully. Continue with AI interview or open your dashboard.
            </p>

            <div className="flex gap-4 justify-center mt-6">

              <button
                onClick={() => navigate(`/interview/${candidateId}`)}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Start Interview
              </button>

              <button
                onClick={() => navigate(`/candidate/${candidateId}`)}
                className="bg-gray-700 dark:bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Go Dashboard
              </button>

            </div>

          </div>

        )}

      </div>

    </div>

  );
}
