import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await API.post("/auth/login", form);
      login(response.data.token, response.data.userId);
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError?.response?.data?.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" description="Continue your resume-based interview preparation.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="error-banner">{error}</div>}
        <Field label="Email"><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="form-input" /></Field>
        <Field label="Password">
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="form-input pr-11" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <button disabled={loading} className="primary-button w-full justify-center">{loading ? "Signing in..." : "Sign in"}</button>
        <p className="text-center text-sm text-slate-500">New here? <Link to="/register" className="font-semibold text-emerald-700 dark:text-emerald-400">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({ title, description, children }) {
  return <main className="page-shell grid place-items-center"><section className="surface w-full max-w-md p-7 sm:p-9"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 mb-7 text-sm text-slate-600 dark:text-slate-300">{description}</p>{children}</section></main>;
}

export function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}</label>;
}
