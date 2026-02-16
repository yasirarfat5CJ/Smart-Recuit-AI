import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/protectedRoute";

import Home from "./pages/Home";
import UploadResume from "./pages/UploadResume";
import Interview from "./pages/Interview";
import Summary from "./pages/Summary";

import HRDashboard from "./pages/HRDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";

import Candidates from "./pages/Candidates";
import CandidateProfile from "./pages/Candidates";   

import CreateJob from "./pages/CreateJob";
import Jobs from "./pages/jobs";

import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {

  return (

    <BrowserRouter>

      {/* GLOBAL NAVBAR */}
      <Navbar />

      <Routes>

        <Route path="/" element={<Home />} />

        {/* CANDIDATE ROUTES */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <UploadResume />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interview/:candidateId"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <Interview />
            </ProtectedRoute>
          }
        />

        <Route path="/summary" element={<Summary />} />

        {/* HR ROUTES */}
        <Route
          path="/hr"
          element={
            <ProtectedRoute allowedRoles={["hr","admin"]}>
              <HRDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/candidates"
          element={
            <ProtectedRoute allowedRoles={["hr","admin"]}>
              <Candidates />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/candidate/:id"
          element={
            <ProtectedRoute allowedRoles={["hr","admin"]}>
              <CandidateProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/create-job"
          element={
            <ProtectedRoute allowedRoles={["hr","admin"]}>
              <CreateJob />
            </ProtectedRoute>
          }
        />

        

        {/* CANDIDATE DASHBOARD */}
        <Route
          path="/candidate/:id"
          element={
            <ProtectedRoute allowedRoles={["candidate"]}>
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
         <Route path="/register" element={<Register />} />
          <Route path="/hr/jobs" element={<Jobs />}/>
          
      </Routes>

    </BrowserRouter>

  );

}

export default App;
