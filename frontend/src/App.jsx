import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/protectedRoute";
import Home from "./pages/Home";
import UploadResume from "./pages/UploadResume";
import Interview from "./pages/Interview";
import Summary from "./pages/Summary";
import CandidateDashboard from "./pages/CandidateDashboard";
import DSAPrep from "./pages/DSAPrep";
import Login from "./pages/Login";
import Register from "./pages/Register";

const StudentRoute = ({ children }) => (
  <ProtectedRoute allowedRoles={["candidate"]}>{children}</ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<StudentRoute><CandidateDashboard /></StudentRoute>} />
        <Route path="/candidate" element={<Navigate to="/dashboard" replace />} />
        <Route path="/candidate/:id" element={<StudentRoute><CandidateDashboard /></StudentRoute>} />
        <Route path="/upload" element={<StudentRoute><UploadResume /></StudentRoute>} />
        <Route path="/dsa" element={<StudentRoute><DSAPrep /></StudentRoute>} />
        <Route path="/interview/:candidateId" element={<StudentRoute><Interview /></StudentRoute>} />
        <Route path="/summary" element={<StudentRoute><Summary /></StudentRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
