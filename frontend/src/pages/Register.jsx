import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { AuthLayout, Field } from "./Login";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (form.password.length < 6) return setError("Use at least 6 characters for your password.");
    try {
      setLoading(true);
      setError("");
      await API.post("/auth/register", form);
      navigate("/login", { replace: true });
    } catch (registerError) {
      setError(registerError?.response?.data?.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" description="One workspace for resume feedback and focused interview practice.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="error-banner">{error}</div>}
        <Field label="Full name"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-input" /></Field>
        <Field label="Email"><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="form-input" /></Field>
        <Field label="Password"><input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="form-input" /></Field>
        <button disabled={loading} className="primary-button w-full justify-center">{loading ? "Creating account..." : "Create account"}</button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-emerald-700 dark:text-emerald-400">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
