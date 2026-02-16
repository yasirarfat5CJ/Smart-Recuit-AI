import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSingleCandidateAPI } from "../services/api";

export default function CandidateDashboard(){

  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate,setCandidate] = useState(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{

    const fetchCandidate = async()=>{

      try{

        const res = await getSingleCandidateAPI(id);
        setCandidate(res.data);

      }catch(err){

        console.log(err);

      }finally{

        setLoading(false);

      }

    };

    fetchCandidate();

  },[id]);

  if(loading) return <div className="p-8">Loading...</div>;
  if(!candidate) return <div className="p-8">Candidate not found</div>;

  const interviewCompleted = !!candidate.finalSummary;

  return(

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">

      <h1 className="text-3xl font-bold mb-8">
        Candidate Dashboard
      </h1>

      {/* SCORE CARDS */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* ATS SCORE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="font-semibold mb-2">
            ATS Score
          </h2>

          <p className="text-4xl font-bold text-blue-600">
            {candidate.atsScore}
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
              Start Interview
            </button>

          )}

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

        </div>

      )}

    </div>

  );

}
