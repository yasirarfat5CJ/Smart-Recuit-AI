import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const { role, userId, logout } = useAuth();
  const navigate = useNavigate();

  // Global Dark Mode
  useEffect(() => {

    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

  }, [dark]);

  const isHR = role === "hr" || role === "admin";
  const navItems = useMemo(() => {
    const items = [{ to: "/", label: "Home" }];
    if (role === "candidate") items.push({ to: "/candidate", label: "Dashboard" });
    if (role === "candidate") items.push({ to: "/upload", label: "Upload Resume" });
    if (isHR) items.push({ to: "/hr", label: "HR Dashboard" });
    if (isHR) items.push({ to: "/hr/jobs", label: "Jobs" });
    return items;
  }, [isHR, role]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  return (

    <>
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-950/90 backdrop-blur text-black dark:text-white px-6 py-4 shadow-sm">

        <div className="flex justify-between items-center">

          <h3 className="text-xl font-bold">
            <Link to="/">Smart Recruit AI</Link>
          </h3>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-6 items-center">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}

            {!userId ? (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)}>Login</NavLink>
                <NavLink to="/register" onClick={() => setOpen(false)}>Register</NavLink>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-white"
                >
                  Logout
                </button>
              </>
            )}

            {/* DARK MODE TOGGLE */}
            <button
              onClick={() => setDark(!dark)}
              className="border border-slate-300 dark:border-slate-600 px-3 py-1 rounded"
            >
              {dark ? "Light" : "Dark"}
            </button>

          </div>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden text-xl"
          onClick={() => setOpen((prev) => !prev)}
        >
          ☰
        </button>

        </div>

      </nav>

      {/* BACKDROP */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/20"
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

        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
            {item.label}
          </NavLink>
        ))}

        {!userId ? (
          <>
            <NavLink to="/login" onClick={() => setOpen(false)}>Login</NavLink>
            <NavLink to="/register" onClick={() => setOpen(false)}>Register</NavLink>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-2 rounded"
          >
            Logout
          </button>
        )}

        {/* ⭐ DARK MODE TOGGLE ADDED TO MOBILE */}
        <button
          onClick={() => setDark(!dark)}
          className="border border-slate-300 dark:border-slate-600 px-3 py-1 rounded"
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>

      </div>

    </>
  );
}

function NavLink({ to, children, onClick }) {

  return (
    <Link
      to={to}
      onClick={onClick}
      className="transition text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
    >
      {children}
    </Link>
  );

}
