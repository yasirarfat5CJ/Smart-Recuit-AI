import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children, allowedRoles }) {

  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-600 dark:text-gray-300">Checking access...</div>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // If user role not allowed → redirect
  if (!allowedRoles.includes(role)) {

    return <Navigate to="/" replace />;

  }

  return children;

}
