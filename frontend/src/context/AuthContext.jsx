import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const savedToken = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("userId");

    if (savedToken && savedRole && savedUser) {
      setRole(savedRole);
      setUserId(savedUser);
    }

    setLoading(false);

  }, []);

  const login = (token, role, userId) => {

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("userId", userId);

    setRole(role);
    setUserId(userId);

  };

  const logout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");

    setRole(null);
    setUserId(null);

  };

  return (

    <AuthContext.Provider value={{
      role,
      userId,
      login,
      logout,
      loading
    }}>

      {children}

    </AuthContext.Provider>

  );
};

export const useAuth = () => useContext(AuthContext);
