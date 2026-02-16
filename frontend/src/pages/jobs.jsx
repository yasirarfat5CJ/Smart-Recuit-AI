import { useEffect, useState } from "react";
import { getJobsAPI, deleteJobAPI, updateJobAPI } from "../services/api";

export default function Jobs(){

  const [jobs,setJobs] = useState([]);
  const [editingId,setEditingId] = useState(null);
  const [editData,setEditData] = useState({});

  useEffect(()=>{

    const fetchJobs = async()=>{

      try{

        const res = await getJobsAPI();
        setJobs(res.data);

      }catch(err){

        console.log(err);

      }

    };

    fetchJobs();

  },[]);

  // DELETE
  const handleDelete = async(id)=>{

    if(!window.confirm("Delete this job?")) return;

    try{

      await deleteJobAPI(id);

      setJobs(jobs.filter(job => job._id !== id));

    }catch(err){

      console.log(err);

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

      const payload = {

        ...editData,
        requiredSkills: editData.requiredSkills.split(","),
        techStack: editData.techStack.split(",")

      };

      const res = await updateJobAPI(id,payload);

      setJobs(jobs.map(j => j._id === id ? res.data : j));

      setEditingId(null);

    }catch(err){

      console.log(err);

    }

  };

  return(

    <div className="min-h-screen pt-24 p-8
                    bg-gray-50 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <h1 className="text-3xl font-bold mb-8">
        Job Management
      </h1>

      {/* ✅ EMPTY STATE UI */}
      {jobs.length === 0 ? (

        <div className="flex justify-center items-center mt-20">

          <div className="bg-white dark:bg-gray-800
                          p-10 rounded-xl shadow-lg text-center">

            <h2 className="text-2xl font-semibold mb-2">
              No Jobs Available
            </h2>

            <p className="text-gray-500 dark:text-gray-300">
              No job postings found. Create a new job to get started.
            </p>

          </div>

        </div>

      ) : (

        <div className="grid md:grid-cols-3 gap-6">

          {jobs.map((job)=> (

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
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Save
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
