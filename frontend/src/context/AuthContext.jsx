import { createContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [role, setRole] = useState(() => localStorage.getItem("token") ? "candidate" : null);
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));

  const login = (token, userId) => {

    localStorage.setItem("token", token);
    localStorage.setItem("role", "candidate");
    localStorage.setItem("userId", userId);

    setRole("candidate");
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
      loading: false
    }}>

      {children}

    </AuthContext.Provider>

  );
};

export default AuthContext;
