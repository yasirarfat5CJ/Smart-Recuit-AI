import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadResumeAPI, getJobsAPI } from "../services/api";

export default function UploadResume() {

  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

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
      alert("Please select job and upload resume");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobId", selectedJob);

    try {

      setLoading(true);

      const res = await UploadResumeAPI(formData);

      setAtsResult(res.data.candidate.atsScore);
      setCandidateId(res.data.candidate._id);

    } catch (error) {

      console.log(error);
      alert("Upload failed");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="min-h-screen flex justify-center items-center
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <div className="bg-white dark:bg-gray-800
                      p-8 rounded-xl shadow-lg
                      w-full max-w-lg">

        <h2 className="text-3xl font-bold mb-6 text-center">
          Upload Resume
        </h2>

        {!atsResult ? (

          <form onSubmit={handleSubmit} className="space-y-4">

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

            <input
              type="file"
              accept="application/pdf"
              className="w-full border dark:border-gray-600
                         p-3 rounded
                         bg-white dark:bg-gray-700
                         focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setFile(e.target.files[0])}
            />

            <button
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-500
                         hover:bg-blue-700 dark:hover:bg-blue-600
                         text-white w-full py-3 rounded
                         transition-all duration-200"
            >
              {loading ? "Analyzing..." : "Upload Resume"}
            </button>

          </form>

        ) : (

          <div className="text-center space-y-4">

            <h3 className="text-xl font-semibold">
              ATS Score
            </h3>

            <div className="text-6xl font-bold text-green-500">
              {atsResult}
            </div>

            <div className="flex gap-4 justify-center mt-6">

              <button
                onClick={() => navigate(`/interview/${candidateId}`)}
                className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
              >
                Start Interview
              </button>

              <button
                onClick={() => navigate(`/candidate/${candidateId}`)}
                className="bg-gray-700 dark:bg-gray-600 text-white px-5 py-2 rounded hover:bg-gray-800"
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
