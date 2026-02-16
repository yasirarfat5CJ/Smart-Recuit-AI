import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Register(){

  const navigate = useNavigate();

  const [form,setForm] = useState({

    name:"",
    email:"",
    password:"",
    role:"candidate"

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

      await API.post("/auth/register",form);

      alert("Registered successfully");

      navigate("/login");

    }catch(err){

      console.log(err);

    }

  };

  return(

    <div className="min-h-screen flex justify-center items-center
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800
                   p-8 rounded-xl shadow-lg
                   w-[400px] space-y-4">

        <h2 className="text-2xl font-bold text-center">
          Register
        </h2>

        <input
          name="name"
          placeholder="Name"
          onChange={handleChange}
          className="border dark:border-gray-600
                     p-3 w-full rounded
                     bg-white dark:bg-gray-700
                     focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="border dark:border-gray-600
                     p-3 w-full rounded
                     bg-white dark:bg-gray-700
                     focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="border dark:border-gray-600
                     p-3 w-full rounded
                     bg-white dark:bg-gray-700
                     focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <select
          name="role"
          onChange={handleChange}
          className="border dark:border-gray-600
                     p-3 w-full rounded
                     bg-white dark:bg-gray-700"
        >

          <option value="candidate">Candidate</option>
          <option value="hr">HR</option>

        </select>

        <button
          className="bg-blue-600 dark:bg-blue-500
                     hover:bg-blue-700 dark:hover:bg-blue-600
                     text-white p-3 w-full rounded
                     transition-all duration-200"
        >
          Register
        </button>

      </form>

    </div>

  );

}
