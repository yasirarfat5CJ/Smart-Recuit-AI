import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getSingleCandidateAPI, deleteCandidateAPI } from "../services/api";
import { useAuth } from "../context/useAuth";

export default function CandidateProfile(){

  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [candidate,setCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const canManageCandidate = role === "hr" || role === "admin";

  const fetchCandidate = useCallback(async()=>{

    try{

      const res = await getSingleCandidateAPI(id);
      setCandidate(res.data);

    }catch(err){

      console.log(err);

    }

  }, [id]);

  useEffect(()=>{

    fetchCandidate();

  },[fetchCandidate]);

  const handleDeleteCandidate = async () => {
    if (!canManageCandidate) return;
    if (!window.confirm("Delete this candidate and all interview records?")) return;

    try {
      setDeleting(true);
      setActionMessage("");
      const res = await deleteCandidateAPI(id);
      setActionMessage(res.data?.message || "Candidate deleted.");
      navigate("/hr");
    } catch (err) {
      console.log(err);
      setActionMessage("Failed to delete candidate.");
    } finally {
      setDeleting(false);
    }
  };

  if(!candidate){

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <h2 className="text-white">Loading...</h2>
      </div>
    );
  }

  return(

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-8">
        Candidate Profile — {candidate.name}
      </h1>

      {canManageCandidate && (
        <div className="mb-6 flex gap-3 items-center">
          <button
            onClick={handleDeleteCandidate}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Delete Candidate"}
          </button>
          {actionMessage ? (
            <span className="text-sm text-gray-700 dark:text-gray-300">{actionMessage}</span>
          ) : null}
        </div>
      )}

      {/* SCORE CARDS */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">

        {/* ATS SCORE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h3 className="font-semibold mb-2">
            ATS Score
          </h3>

          <p className="text-4xl font-bold text-blue-600">
            {candidate.atsScore}
          </p>

        </div>

        {/* INTERVIEW SCORE */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h3 className="font-semibold mb-2">
            Interview Score
          </h3>

          <p className="text-4xl font-bold text-purple-600">

            {candidate.totalScore || "Pending"}

          </p>

        </div>

        {/* STATUS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h3 className="font-semibold mb-2">
            Recommendation
          </h3>

          <p className={`text-xl font-bold ${
            candidate.finalSummary?.recommendation === "Hire"
              ? "text-green-500"
              : "text-red-500"
          }`}>
            {candidate.finalSummary?.recommendation || "N/A"}
          </p>

        </div>

      </div>

      {/* PARSED RESUME */}
      {candidate.parsedResume && (

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8">

          <h2 className="text-xl font-semibold mb-4">
            Parsed Resume
          </h2>

          <p>
            <b>Skills:</b> {candidate.parsedResume.skills?.join(", ")}
          </p>

          <p>
            <b>Tech Stack:</b> {candidate.parsedResume.techStack?.join(", ")}
          </p>

        </div>

      )}

      {/* INTERVIEW SUMMARY */}
      {candidate.finalSummary && (

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">

          <h2 className="text-xl font-semibold mb-4">
            Interview Summary
          </h2>

          <p><b>Strengths:</b> {candidate.finalSummary.strengths}</p>

          <p><b>Weaknesses:</b> {candidate.finalSummary.weaknesses}</p>

          <p><b>Overall Rating:</b> {candidate.finalSummary.overallRating}</p>

          <p><b>Overall Feedback:</b> {candidate.finalSummary.overallFeedback || "N/A"}</p>

        </div>

      )}

    </div>

  );

}
