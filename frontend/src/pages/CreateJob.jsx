import { useState } from "react";
import { createJobAPI } from "../services/api";

export default function CreateJob(){

  const [form,setForm] = useState({
    title:"",
    description:"",
    requiredSkills:"",
    techStack:"",
    minExperienceYears:0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const handleSubmit = async(e)=>{

    e.preventDefault();

    if (!form.title.trim()) {
      setError("Job title is required.");
      return;
    }

    try{
      setLoading(true);
      setError("");
      setSuccess("");

      const payload = {

        ...form,
        requiredSkills: form.requiredSkills.split(",").map((v) => v.trim()).filter(Boolean),
        techStack: form.techStack.split(",").map((v) => v.trim()).filter(Boolean)

      };

      await createJobAPI(payload);
      setSuccess("Job created successfully.");
      setForm({
        title:"",
        description:"",
        requiredSkills:"",
        techStack:"",
        minExperienceYears:0
      });

    }catch(err){

      console.log(err);
      setError("Failed to create job. Please try again.");
    } finally {
      setLoading(false);

    }

  };

  return(

    <div className="min-h-screen pt-24
                    bg-gray-50 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    flex items-center justify-center
                    transition-colors duration-300">

      <div className="w-full max-w-lg px-6">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-8 text-center">
          Create Job
        </h1>

        {/* FORM CARD */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800
                     p-8 rounded-xl shadow-lg
                     space-y-5 transition-all"
        >

          {error ? (
            <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-2 text-sm">
              {success}
            </div>
          ) : null}

          <Input name="title" value={form.title} placeholder="Job Title" handleChange={handleChange} />

          <Textarea name="description" value={form.description} placeholder="Description" handleChange={handleChange} />

          <Input name="requiredSkills" value={form.requiredSkills} placeholder="Skills (comma separated)" handleChange={handleChange} />

          <Input name="techStack" value={form.techStack} placeholder="Tech Stack (comma separated)" handleChange={handleChange} />

          <Input
            type="number"
            name="minExperienceYears"
            value={form.minExperienceYears}
            placeholder="Minimum Experience"
            handleChange={handleChange}
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 dark:bg-blue-500
                       text-white px-4 py-3 rounded-lg
                       hover:bg-blue-700 dark:hover:bg-blue-600
                       disabled:opacity-70 disabled:cursor-not-allowed
                       transition-all duration-200 font-semibold"
          >
            {loading ? "Creating..." : "Create Job"}
          </button>

        </form>

      </div>

    </div>

  );

}


/* ---------- REUSABLE INPUT COMPONENT ---------- */

function Input({ name, value, placeholder, handleChange, type="text" }) {

  return(

    <input
      type={type}
      name={name}
      value={value}
      placeholder={placeholder}
      className="border dark:border-gray-600
                 bg-white dark:bg-gray-700
                 p-3 w-full rounded-lg
                 focus:ring-2 focus:ring-blue-500
                 outline-none transition"
      onChange={handleChange}
    />

  );

}

function Textarea({ name, value, placeholder, handleChange }) {

  return(

    <textarea
      name={name}
      value={value}
      placeholder={placeholder}
      className="border dark:border-gray-600
                 bg-white dark:bg-gray-700
                 p-3 w-full rounded-lg
                 focus:ring-2 focus:ring-blue-500
                 outline-none transition"
      onChange={handleChange}
    />

  );

}
