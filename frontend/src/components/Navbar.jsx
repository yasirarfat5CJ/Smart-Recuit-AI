import { BookOpenCheck, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const { userId, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const signOut = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const links = userId
    ? [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/dsa", label: "DSA" },
      { to: "/resources", label: "Resources" },
      { to: "/upload", label: "Resume" }
    ]
    : [];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white">
            <BookOpenCheck size={19} />
          </span>
          Interview Prep AI
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `px-3 py-2 text-sm font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300"}`}
            >
              {item.label}
            </NavLink>
          ))}
          {!userId && <Link to="/login" className="px-3 py-2 text-sm font-medium">Sign in</Link>}
          {!userId && <Link to="/register" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Create account</Link>}
          {userId && (
            <button onClick={signOut} className="icon-button" title="Sign out" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          )}
          <button onClick={() => setDark((value) => !value)} className="icon-button" title="Toggle theme" aria-label="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <button onClick={() => setOpen((value) => !value)} className="icon-button md:hidden" aria-label="Open menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className="py-2">{item.label}</NavLink>)}
            {!userId && <Link to="/login" onClick={() => setOpen(false)} className="py-2">Sign in</Link>}
            {!userId && <Link to="/register" onClick={() => setOpen(false)} className="py-2">Create account</Link>}
            {userId && <button onClick={signOut} className="flex items-center gap-2 py-2 text-left"><LogOut size={18} /> Sign out</button>}
            <button onClick={() => setDark((value) => !value)} className="flex items-center gap-2 py-2 text-left">
              {dark ? <Sun size={18} /> : <Moon size={18} />} Theme
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
