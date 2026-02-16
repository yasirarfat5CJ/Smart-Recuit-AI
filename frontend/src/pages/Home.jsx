import { Link } from "react-router-dom";

export default function Home(){

  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">

      {/* HERO SECTION */}
      <section className="text-center px-6 py-20">

        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Smart AI Recruitment Platform
        </h1>

        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
          Automate hiring using AI-powered resume parsing,
          intelligent ATS scoring, and real-time technical interviews.
        </p>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">

          <Link
            to="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition"
          >
            Upload Resume
          </Link>

          <Link
            to="/hr"
            className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 px-8 py-3 rounded-lg transition"
          >
            HR Dashboard
          </Link>

        </div>

      </section>

      {/* FEATURES SECTION */}
      <section className="px-6 md:px-12 pb-20">

        <h2 className="text-3xl font-bold text-center mb-12">
          Platform Features
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <FeatureCard
            title="AI Resume Parsing"
            desc="Extract structured data automatically using AI."
          />

          <FeatureCard
            title="ATS Scoring"
            desc="Smart evaluation based on job requirements."
          />

          <FeatureCard
            title="AI Technical Interview"
            desc="Dynamic AI-driven interview conversations."
          />

          <FeatureCard
            title="HR Analytics"
            desc="Rank candidates with powerful insights."
          />

        </div>

      </section>

    </div>

  );
}

function FeatureCard({ title, desc }) {

  return (

    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-sm p-6 hover:shadow-lg transition duration-300">

      <h3 className="font-semibold text-lg mb-2">
        {title}
      </h3>

      <p className="text-gray-600 dark:text-gray-300 text-sm">
        {desc}
      </p>

    </div>

  );
}
