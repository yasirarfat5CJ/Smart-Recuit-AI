import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {

  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const { role, userId, logout } = useAuth();
  const location = useLocation();

  // Global Dark Mode
  useEffect(() => {

    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

  }, [dark]);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const isHR = role === "hr" || role === "admin";

  return (

    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-black text-black dark:text-white px-6 py-4 shadow-md">

        <div className="flex justify-between items-center">

          <h3 className="text-xl font-bold">
            <Link to="/">Smart Recruit AI</Link>
          </h3>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-6 items-center">

            <NavLink to="/">Home</NavLink>

            {role === "candidate" && (
              <NavLink to="/upload">Upload Resume</NavLink>
            )}

            {isHR && (
              <NavLink to="/hr">HR Dashboard</NavLink>
            )}

            {!userId ? (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/hr/jobs">Jobs</NavLink>

                <button
                  onClick={logout}
                  className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            )}

            {/* DARK MODE TOGGLE */}
            <button
              onClick={() => setDark(!dark)}
              className="border px-3 py-1 rounded"
            >
              {dark ? "☀️" : "🌙"}
            </button>

          </div>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden text-xl"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>

        </div>

      </nav>

      {/* BACKDROP */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* MOBILE FLOATING MENU */}
      <div
        className={`
          fixed top-16 right-4
          w-64
          rounded-xl
          shadow-xl
          border border-gray-200 dark:border-gray-700
          bg-white/95 dark:bg-gray-900/95
          backdrop-blur-lg
          p-5
          flex flex-col gap-4
          transform transition-all duration-300
          z-50
          md:hidden
          ${open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"}
        `}
      >

        <NavLink to="/">Home</NavLink>

        <NavLink to="/hr/jobs">Jobs</NavLink>

        {role === "candidate" && (
          <NavLink to="/upload">Upload Resume</NavLink>
        )}

        {isHR && (
          <NavLink to="/hr">HR Dashboard</NavLink>
        )}

        {!userId ? (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        ) : (
          <button onClick={logout}>Logout</button>
        )}

        {/* ⭐ DARK MODE TOGGLE ADDED TO MOBILE */}
        <button
          onClick={() => setDark(!dark)}
          className="border px-3 py-1 rounded"
        >
          {dark ? "☀️ Dark" : "🌙 Light"}
        </button>

      </div>

    </>
  );
}

function NavLink({ to, children }) {

  return (
    <Link
      to={to}
      className="transition text-black dark:text-red-500 hover:text-blue-500 dark:hover:text-red-400"
    >
      {children}
    </Link>
  );

}
