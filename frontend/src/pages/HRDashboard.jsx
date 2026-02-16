import { useEffect, useState } from "react";
import { getCandidateAPI, getDashboardStatsAPI } from "../services/api";
import { Link, useNavigate } from "react-router-dom";

export default function HRDashboard() {

  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {

    const fetchData = async () => {

      try {

        const statsRes = await getDashboardStatsAPI();
        setStats(statsRes.data);

        const candidatesRes = await getCandidateAPI();

        const sorted = candidatesRes.data.sort(
          (a, b) => (b.totalScore + b.atsScore) - (a.totalScore + a.atsScore)
        );

        setCandidates(sorted);

      } catch (error) {
        console.log(error);
      }

    };

    fetchData();

  }, []);

  const filteredCandidates = candidates.filter(c => {

    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "All" || c.recommendation === filter;

    return matchSearch && matchFilter;

  });

  return (

    <div className="min-h-screen pt-24 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 transition-colors duration-300">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">
          HR Dashboard
        </h1>

        <div className="flex gap-3">

          <Link
            to="/hr/create-job"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg
                       hover:bg-blue-700
                       dark:bg-blue-500 dark:hover:bg-blue-600
                       transition-all duration-200 shadow-sm"
          >
            + Create Job
          </Link>

          <Link
            to="/hr/jobs"
            className="border px-5 py-2 rounded-lg
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-all duration-200"
          >
            View Jobs
          </Link>

        </div>

      </div>

      {/* STAT CARDS */}
      {stats && (

        <div className="grid md:grid-cols-4 gap-6 mb-10">

          <StatCard title="Total Candidates" value={stats.totalCandidates} />
          <StatCard title="Average ATS Score" value={stats.averageATSScore} />
          <StatCard title="Average Interview Score" value={stats.averageInterviewScore} />
          <StatCard title="Hire Recommendations" value={stats.hireRecommendations} />

        </div>

      )}

      {/* FILTER BAR */}
      <div className="flex gap-4 mb-6">

        <input
          placeholder="Search candidate..."
          className="border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded w-64"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />

        <select
          className="border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded"
          value={filter}
          onChange={(e)=>setFilter(e.target.value)}
        >
          <option>All</option>
          <option>Hire</option>
          <option>No Hire</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">

        <h2 className="text-xl font-semibold p-6 border-b dark:border-gray-700">
          Candidate Rankings
        </h2>

        <table className="w-full">

          <thead className="bg-gray-100 dark:bg-gray-700">

            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4">ATS Score</th>
              <th className="p-4">Interview Score</th>
              <th className="p-4">Recommendation</th>
            </tr>

          </thead>

          <tbody>

            {filteredCandidates.map((c, index) => (

              <tr
                key={index}
                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/hr/candidate/${c._id}`)}
              >

                <td className="p-4">{c.name}</td>

                <td className="p-4 text-center text-blue-600 dark:text-blue-400 font-semibold">
                  {c.atsScore}
                </td>

                <td className="p-4 text-center text-purple-600 dark:text-purple-400 font-semibold">
                  {c.totalScore}
                </td>

                <td className="p-4 text-center">

                  <span
                    className={`px-3 py-1 rounded-full text-sm
                      ${
                        c.recommendation === "Hire"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                      }`}
                  >
                    {c.recommendation}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );
}

function StatCard({ title, value }) {

  return (

    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">

      <p className="text-gray-500 dark:text-gray-300">{title}</p>

      <h2 className="text-2xl font-bold mt-2">
        {value}
      </h2>

    </div>

  );
}
