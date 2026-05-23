import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

API.interceptors.request.use((config) => {
   const token = localStorage.getItem("token");

  if(token){

    config.headers.Authorization = `Bearer ${token}`;

  }
  return config;
});

// Resume Upload
export const UploadResumeAPI = (formData) => {
  return API.post("/resume/upload", formData);
};

// HR APIs
export const getCandidateAPI = () => {
  return API.get("/hr/candidates");
};


export const getSingleCandidateAPI = (id) => {
  return API.get(`/hr/candidate/${id}`);
};

export const getMyCandidateDashboardAPI = () => {
  return API.get("/hr/candidate/me/dashboard");
};


export const getDashboardStatsAPI = () => {
  return API.get("/hr/dashboard-stats");
};

export const deleteCandidateAPI = (id) => {
  return API.delete(`/hr/candidate/${id}`);
};

// Job APIs
export const createJobAPI = (data) => {
  return API.post("/jobs/create", data);
};

export const getJobsAPI = () => {
  return API.get("/jobs");
};

export const deleteJobAPI = (id) => {
  return API.delete(`/jobs/${id}`);
};

export const updateJobAPI = (id,data) => {
  return API.put(`/jobs/${id}`,data);
};

export default API;
