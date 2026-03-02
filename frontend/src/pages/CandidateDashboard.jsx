import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMyCandidateDashboardAPI, getSingleCandidateAPI } from "../services/api";

export default function CandidateDashboard(){

  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate,setCandidate] = useState(null);
  const [loading,setLoading] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(()=>{

    const fetchCandidate = async()=>{

      try{
        setLoading(true);
        setError("");

        if (id) {
          const res = await getSingleCandidateAPI(id);
          setCandidate(res.data);
          setUploadCount(1);
        } else {
          const res = await getMyCandidateDashboardAPI();
          setCandidate(res.data.latestCandidate);
          setUploadCount(res.data.uploadCount || 0);
        }

      }catch(err){

        console.log(err);
        if (err?.response?.status === 404) {
          setError("No resume uploaded yet. Upload your resume to start.");
        } else {
          setError("Failed to load candidate dashboard.");
        }
        setCandidate(null);

      }finally{

        setLoading(false);

      }

    };

    fetchCandidate();

  },[id]);

  if(loading) return <div className="p-8">Loading...</div>;
  if(!candidate) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-xl bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold mb-2">Candidate Dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {error || "Candidate not found"}
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  const interviewCompleted = !!candidate.finalSummary;
  const interviewActionLabel = interviewCompleted ? "Interview Completed" : "Continue Interview";

  return(

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        Candidate Dashboard
      </h1>

      {/* SCORE CARDS */}
      <div className="grid md:grid-cols-5 gap-6">

        {/* ATS SCORE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            ATS Score
          </h2>

          <p className="text-4xl font-bold text-blue-600">
            {candidate.atsScore}
          </p>

        </div>

        {/* UPLOAD COUNT */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            Resume Uploads
          </h2>

          <p className="text-4xl font-bold text-emerald-600">
            {uploadCount}
          </p>

        </div>

        {/* INTERVIEW SCORE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            Interview Score
          </h2>

          <p className="text-4xl font-bold text-purple-600">
            {candidate.totalScore || "Pending"}
          </p>

        </div>

        {/* STATUS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            Interview Status
          </h2>

          {interviewCompleted ? (

            <p className="text-green-500 font-bold">
              Completed
            </p>

          ) : (

            <button
              onClick={() => navigate(`/interview/${candidate._id}`)}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {interviewActionLabel}
            </button>

          )}

        </div>

        {/* RECOMMENDATION */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            Recommendation
          </h2>

          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              candidate.finalSummary?.recommendation === "Hire"
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : candidate.finalSummary?.recommendation === "No Hire"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            {candidate.finalSummary?.recommendation || "Pending"}
          </span>

        </div>

      </div>

      {/* PROGRESS TRACKER */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mt-6">

        <h2 className="text-xl font-semibold mb-4">
          Progress
        </h2>

        <ul className="space-y-2">

          <li>Resume Uploaded</li>

          <li>ATS Score Generated</li>

          <li>
            {interviewCompleted
              ? "Interview Completed"
              : "Interview Pending"}
          </li>

        </ul>

      </div>

      {/* SUMMARY */}
      {candidate.finalSummary && (

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mt-6">

          <h2 className="text-xl font-semibold mb-4">
            Interview Summary
          </h2>

          <p><b>Strengths:</b> {candidate.finalSummary.strengths}</p>
          <p><b>Weaknesses:</b> {candidate.finalSummary.weaknesses}</p>
          <p><b>Rating:</b> {candidate.finalSummary.overallRating}</p>
          <p><b>Overall Feedback:</b> {candidate.finalSummary.overallFeedback || "N/A"}</p>

        </div>

      )}

    </div>

  );

}
