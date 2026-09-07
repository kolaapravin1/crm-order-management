import axios from "axios";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const assetUrl = (url) => {
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `${apiOrigin}${url}`;
};

const api = axios.create({ baseURL: `${apiOrigin}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("crm_token");
      localStorage.removeItem("crm_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
