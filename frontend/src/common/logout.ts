export function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function logoutUser(token?: string | null) {
  if (!token) {
    clearAuthStorage();
    return;
  }

  try {
    await fetch("http://localhost:8080/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } finally {
    clearAuthStorage();
  }
}
