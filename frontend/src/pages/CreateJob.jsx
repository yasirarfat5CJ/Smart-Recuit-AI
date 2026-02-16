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

  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const handleSubmit = async(e)=>{

    e.preventDefault();

    try{

      const payload = {

        ...form,
        requiredSkills: form.requiredSkills.split(","),
        techStack: form.techStack.split(",")

      };

      await createJobAPI(payload);

      alert("Job Created Successfully");

    }catch(err){

      console.log(err);

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

          <Input name="title" placeholder="Job Title" handleChange={handleChange} />

          <Textarea name="description" placeholder="Description" handleChange={handleChange} />

          <Input name="requiredSkills" placeholder="Skills (comma separated)" handleChange={handleChange} />

          <Input name="techStack" placeholder="Tech Stack (comma separated)" handleChange={handleChange} />

          <Input
            type="number"
            name="minExperienceYears"
            placeholder="Minimum Experience"
            handleChange={handleChange}
          />

          <button
            className="w-full bg-blue-600 dark:bg-blue-500
                       text-white px-4 py-3 rounded-lg
                       hover:bg-blue-700 dark:hover:bg-blue-600
                       transition-all duration-200 font-semibold"
          >
            Create Job
          </button>

        </form>

      </div>

    </div>

  );

}


/* ---------- REUSABLE INPUT COMPONENT ---------- */

function Input({ name, placeholder, handleChange, type="text" }) {

  return(

    <input
      type={type}
      name={name}
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

function Textarea({ name, placeholder, handleChange }) {

  return(

    <textarea
      name={name}
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
