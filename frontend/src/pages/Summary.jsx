import { useLocation, useNavigate } from "react-router-dom";

export default function Summary() {

  const { state } = useLocation();
  const navigate = useNavigate();

  const summary = state?.summary;
  const candidateId = state?.candidateId;

  if (!summary) {

    return (

      <div className="min-h-screen flex items-center justify-center
                      bg-gray-100 dark:bg-gray-900
                      text-gray-900 dark:text-white">

        <h2>No summary found</h2>

      </div>

    );

  }

  return (

    <div className="min-h-screen px-4 flex items-center justify-center
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <div className="bg-white dark:bg-gray-800
                      p-8 rounded-xl shadow-lg
                      max-w-xl w-full">

        <h2 className="text-3xl font-bold mb-6 text-center">
          Interview Summary
        </h2>

        <p className="mb-2">
          <b>Strengths:</b> {summary.strengths}
        </p>

        <p className="mb-2">
          <b>Weaknesses:</b> {summary.weaknesses}
        </p>

        <p className="mb-2">
          <b>Overall Rating:</b> {summary.overallRating}
        </p>

        <p className="mb-2">
          <b>Overall Feedback:</b> {summary.overallFeedback || "N/A"}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-lg font-semibold">Recommendation:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              summary.recommendation === "Hire"
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            }`}
          >
            {summary.recommendation || "N/A"}
          </span>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          {candidateId ? (
            <button
              onClick={() => navigate(`/candidate/${candidateId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Open Dashboard
            </button>
          ) : null}
          <button
            onClick={() => navigate("/")}
            className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Go Home
          </button>
        </div>

      </div>

    </div>

  );
}
