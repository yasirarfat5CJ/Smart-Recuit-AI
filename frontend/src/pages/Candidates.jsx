import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSingleCandidateAPI } from "../services/api";

export default function CandidateProfile(){

  const { id } = useParams();
  const [candidate,setCandidate] = useState(null);

  useEffect(()=>{

    const fetchCandidate = async()=>{

      try{

        const res = await getSingleCandidateAPI(id);
        setCandidate(res.data);

      }catch(err){

        console.log(err);

      }

    };

    fetchCandidate();

  },[id]);

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

        </div>

      )}

    </div>

  );

}
