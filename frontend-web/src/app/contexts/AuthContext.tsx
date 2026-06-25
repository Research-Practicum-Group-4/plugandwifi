import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../../types/api";
import { api } from "../../services/api";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from localStorage
    const savedToken = localStorage.getItem("access_token");
    const savedUserJson = localStorage.getItem("user_profile");

    if (savedToken && savedUserJson) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUserJson));
      } catch (e) {
        console.error("Failed to parse saved user profile", e);
        // Clear corrupt storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_profile");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });
      
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("user_profile", JSON.stringify(response.user));
      
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      console.error("Login context failed:", error);
      throw error;
    }
  };

  const register = async (fullName: string, email: string, password: string, role?: string) => {
    try {
      await api.register({
        full_name: fullName,
        email: email,
        password: password,
        role: role,
      });
      // Optionally auto-login or let the UI handle redirection to /login
    } catch (error) {
      console.error("Registration context failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
