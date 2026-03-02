import { useCallback, useEffect, useMemo, useState } from "react";
import { getJobsAPI, deleteJobAPI, updateJobAPI } from "../services/api";

export default function Jobs(){

  const [jobs,setJobs] = useState([]);
  const [editingId,setEditingId] = useState(null);
  const [editData,setEditData] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchJobs = useCallback(async()=>{
    try{
      setLoading(true);
      setError("");
      const res = await getJobsAPI();
      setJobs(res.data);
    }catch(err){
      console.log(err);
      setError("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{
    fetchJobs();
  },[fetchJobs]);

  // DELETE
  const handleDelete = async(id)=>{

    if(!window.confirm("Delete this job?")) return;

    try{
      setMessage("");
      setError("");

      await deleteJobAPI(id);

      setJobs(prev => prev.filter(job => job._id !== id));
      setMessage("Job deleted successfully.");

    }catch(err){

      console.log(err);
      setError("Failed to delete job.");

    }

  };

  // START EDIT
  const startEdit = (job)=>{

    setEditingId(job._id);

    setEditData({
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills.join(", "),
      techStack: job.techStack.join(", "),
      minExperienceYears: job.minExperienceYears
    });

  };

  // SAVE EDIT
  const saveEdit = async(id)=>{

    try{
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {

        ...editData,
        requiredSkills: editData.requiredSkills.split(",").map((v) => v.trim()).filter(Boolean),
        techStack: editData.techStack.split(",").map((v) => v.trim()).filter(Boolean)

      };

      const res = await updateJobAPI(id,payload);

      setJobs(prev => prev.map(j => j._id === id ? res.data : j));

      setEditingId(null);
      setMessage("Job updated successfully.");

    }catch(err){

      console.log(err);
      setError("Failed to update job.");
    } finally {
      setSaving(false);

    }

  };

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const q = search.toLowerCase();
    return (
      job.title?.toLowerCase().includes(q) ||
      job.description?.toLowerCase().includes(q)
    );
  }), [jobs, search]);

  return(

    <div className="min-h-screen pt-24 p-8
                    bg-gray-50 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <h1 className="text-3xl font-bold mb-8">
        Job Management
      </h1>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or description..."
          className="border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded md:w-96"
        />
        <button
          onClick={fetchJobs}
          className="border px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition w-fit"
        >
          Refresh
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-300 md:ml-auto self-center">
          Showing {filteredJobs.length} of {jobs.length}
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 text-sm">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-2 text-sm">{message}</div>
      ) : null}

      {/* ✅ EMPTY STATE UI */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow text-sm text-gray-600 dark:text-gray-300">
          Loading jobs...
        </div>
      ) : filteredJobs.length === 0 ? (

        <div className="flex justify-center items-center mt-20">

          <div className="bg-white dark:bg-gray-800
                          p-10 rounded-xl shadow-lg text-center">

            <h2 className="text-2xl font-semibold mb-2">
              No Jobs Available
            </h2>

            <p className="text-gray-500 dark:text-gray-300">
              No matching job postings found. Adjust search or create a new job.
            </p>

          </div>

        </div>

      ) : (

        <div className="grid md:grid-cols-3 gap-6">

          {filteredJobs.map((job)=> (

            <div
              key={job._id}
              className="bg-white dark:bg-gray-800
                         p-6 rounded-xl shadow-lg
                         hover:shadow-xl hover:-translate-y-1
                         transition-all duration-300"
            >

              {/* TITLE */}
              {editingId === job._id ? (

                <input
                  value={editData.title}
                  onChange={(e)=>setEditData({...editData,title:e.target.value})}
                  className="border dark:border-gray-600
                             bg-white dark:bg-gray-700
                             p-2 w-full mb-2 rounded"
                />

              ) : (

                <h2 className="text-xl font-semibold mb-2">
                  {job.title}
                </h2>

              )}

              {/* DESCRIPTION */}
              {editingId === job._id ? (

                <textarea
                  value={editData.description}
                  onChange={(e)=>setEditData({...editData,description:e.target.value})}
                  className="border dark:border-gray-600
                             bg-white dark:bg-gray-700
                             p-2 w-full mb-2 rounded"
                />

              ) : (

                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  {job.description}
                </p>

              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-4">

                {editingId === job._id ? (

                  <button
                    onClick={()=>saveEdit(job._id)}
                    disabled={saving}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>

                ) : (

                  <button
                    onClick={()=>startEdit(job)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>

                )}

                <button
                  onClick={()=>handleDelete(job._id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}
