import axios from 'axios';

const API_BASE_URL = 'https://localhost:7059'; // Adjust to your .NET API port

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Allows sending and receiving HttpOnly cookies (Refresh Token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// We need a variable to store the JWT access token in memory
let accessToken = '';

export const setAccessToken = (token: string) => {
  accessToken = token;
};

// Request Interceptor: Attach the JWT to every request if we have it
axiosClient.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized by rotating the refresh token
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to retry this specific request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token using the HttpOnly cookie
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        // Success! Extract new JWT
        const newAccessToken = refreshResponse.data.accessToken;
        setAccessToken(newAccessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails (e.g., token expired or revoked), we must log the user out
        setAccessToken('');
        // Optional: Redirect to login or dispatch a global logout event
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
