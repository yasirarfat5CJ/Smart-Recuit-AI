import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
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
  return API.post("/resume/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// HR APIs
export const getCandidateAPI = () => {
  return API.get("/hr/candidates");
};


export const getSingleCandidateAPI = (id) => {
  return API.get(`/hr/candidate/${id}`);
};


export const getDashboardStatsAPI = () => {
  return API.get("/hr/dashboard-stats");
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
