import { useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login(){

  const navigate = useNavigate();
  const { login } = useAuth();

  const [form,setForm] = useState({
    email:"",
    password:""
  });

  const [error,setError] = useState("");

  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const handleSubmit = async(e)=>{

    e.preventDefault();

    try{

      setError("");

      const res = await API.post("/auth/login",form);

      login(
        res.data.token,
        res.data.role,
        res.data.userId
      );

      navigate("/", { replace:true });

    }catch(err){

      console.log(err);
      setError("Credentials do not match");

    }

  };

  return(

    <div className="min-h-screen pt-24
                    flex justify-center items-center
                    bg-gray-100 dark:bg-gray-900
                    text-gray-900 dark:text-white
                    transition-colors duration-300">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800
                   p-8 rounded-xl shadow-lg
                   w-[400px] space-y-4"
      >

        <h2 className="text-2xl font-bold text-center">
          Login
        </h2>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900
                          text-red-600 dark:text-red-300
                          p-2 rounded text-sm">
            {error}
          </div>
        )}

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="border dark:border-gray-600
                     bg-white dark:bg-gray-700
                     p-3 w-full rounded
                     focus:ring-2 focus:ring-green-500
                     outline-none"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="border dark:border-gray-600
                     bg-white dark:bg-gray-700
                     p-3 w-full rounded
                     focus:ring-2 focus:ring-green-500
                     outline-none"
        />

        <button
          className="bg-green-600 dark:bg-green-500
                     hover:bg-green-700 dark:hover:bg-green-600
                     text-white p-3 w-full rounded
                     transition-all duration-200"
        >
          Login
        </button>

      </form>

    </div>

  );

}
