import axios from "axios";
import { env } from "@/libs/env";
import { getToken, setToken, clearAllTokens } from "@/libs/secureStorage";
import logger from "@/libs/logger";

// ============================================================================
// Axios Instance
// ============================================================================

export const axiosInstance = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// Request Interceptor — inject stored cookies
// ============================================================================

axiosInstance.interceptors.request.use(
  async (config) => {
    const accessToken = await getToken("accessToken");
    const refreshToken = await getToken("refreshToken");

    if (accessToken || refreshToken) {
      const cookieParts: string[] = [];
      if (accessToken) cookieParts.push(`accessToken=${accessToken}`);
      if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`);
      config.headers["Cookie"] = cookieParts.join("; ");
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================================
// Response Interceptor — parse Set-Cookie & handle 401
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response) => {
    // Parse Set-Cookie headers from login/refresh responses
    const setCookieHeader =
      response.headers["set-cookie"] ?? response.headers["Set-Cookie"];

    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];

      cookies.forEach((cookie: string) => {
        const match = cookie.match(/^(\w+)=([^;]+)/);
        if (match) {
          const [, name, value] = match;
          if (name === "accessToken" || name === "refreshToken") {
            setToken(name as "accessToken" | "refreshToken", value).catch(
              logger.error,
            );
          }
        }
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axiosInstance.post("/api/system/auth/refresh");
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearAllTokens();
        // Store flush will be handled by auth state listener
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
