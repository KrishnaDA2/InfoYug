import api from "../services/api";

const TOKEN_KEY = "infoyug_admin_token";
const USER_KEY = "infoyug_admin_user";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser() {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveAdminSession(data) {
  const token = data?.token;
  const user = {
    userId: data?.userId,
    name: data?.name || data?.email || "Admin",
    email: data?.email || "",
    role: data?.role || "",
  };

  if (!token) throw new Error("Login response mein JWT token nahi mila.");
  if (String(user.role).toLowerCase() !== "admin") {
    throw new Error("Is account ko Admin access nahi hai.");
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  return user;
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  delete api.defaults.headers.common.Authorization;
}

export function restoreAdminSession() {
  const token = getAdminToken();
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  return Boolean(token && String(getAdminUser()?.role).toLowerCase() === "admin");
}
