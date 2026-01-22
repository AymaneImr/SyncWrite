import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { ReactNode } from "react";

export function isAuthenticated(): boolean {
  const token = localStorage.getItem("access_token");

  if (!token) return false;

  try {
    const decoded = jwtDecode(token);

    return decoded.exp * 1000 > Date.now();
  } catch (err) {
    alert("jwt decode error");
    return false;
  }
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

