import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {

  const { role } = useAuth();

  // If user role not allowed → redirect
  if (!allowedRoles.includes(role)) {

    return <Navigate to="/" replace />;

  }

  return children;

}
