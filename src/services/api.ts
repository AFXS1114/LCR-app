import axios from 'axios';
import { storage } from './storage';

export const api = axios.create({
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const serverConfig = await storage.getServerConfig();
  if (serverConfig.ip && serverConfig.port) {
    config.baseURL = `http://${serverConfig.ip}:${serverConfig.port}`;
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
      // Logic to handle token expiration could go here
      await storage.removeToken();
    }
    return Promise.reject(error);
  }
);
