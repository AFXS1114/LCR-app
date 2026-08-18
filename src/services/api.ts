import axios from 'axios';
import { storage } from './storage';

export const api = axios.create({
  timeout: 20000,
});

const resolveBaseUrl = async () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  if (envBaseUrl) {
    return envBaseUrl;
  }

  // Returns saved server URL or falls back to 'https://search-lcr.vercel.app' (matching web/src/App.jsx)
  return await storage.getServerUrl();
};

api.interceptors.request.use(async (config) => {
  const baseURL = await resolveBaseUrl();
  if (baseURL) {
    config.baseURL = baseURL;
  }

  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for handling common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeToken();
    }
    return Promise.reject(error);
  }
);
