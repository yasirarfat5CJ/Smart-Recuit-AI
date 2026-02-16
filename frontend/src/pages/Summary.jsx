import { useLocation } from "react-router-dom";

export default function Summary() {

  const { state } = useLocation();

  const summary = state?.summary;

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

    <div className="min-h-screen flex items-center justify-center
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

        <p className="text-xl mt-4">
          Recommendation:
          <span className="font-bold text-green-600 dark:text-green-400 ml-2">
            {summary.recommendation}
          </span>
        </p>

      </div>

    </div>

  );
}
