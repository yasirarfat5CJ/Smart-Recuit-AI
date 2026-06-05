import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`,
  timeout: 60000
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const uploadResume = (formData) => API.post("/resume/upload", formData);
export const getStudentDashboard = () => API.get("/student/dashboard");
export const getStudentResume = (id) => API.get(`/student/resume/${id}`);

export default API;
