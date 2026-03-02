import { useState } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";

export default function Register(){

  const navigate = useNavigate();

  const [form,setForm] = useState({

    name:"",
    email:"",
    password:"",
    role:"candidate"

  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const handleSubmit = async(e)=>{

    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("All fields are required.");
      return;
    }

    try{
      setLoading(true);
      setError("");
      setSuccess("");

      await API.post("/auth/register",form);
      setSuccess("Registered successfully. Redirecting to login...");

      setTimeout(() => navigate("/login"), 600);

    }catch(err){

      console.log(err);
      setError(err?.response?.data?.message || "Failed to register.");
    } finally {
      setLoading(false);

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
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="border dark:border-gray-600
                     p-3 w-full rounded
                     bg-white dark:bg-gray-700
                     focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>

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
          disabled={loading}
          className="bg-blue-600 dark:bg-blue-500
                     hover:bg-blue-700 dark:hover:bg-blue-600
                     text-white p-3 w-full rounded disabled:opacity-70 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Login
          </Link>
        </p>

      </form>

    </div>

  );

}
