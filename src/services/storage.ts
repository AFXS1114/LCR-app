import * as SecureStore from 'expo-secure-store';

// ─── Default server URL (mirrors web app config) ────────────────────────────
// The web app (web/src/App.jsx) hardcodes this as its default server URL.
// The mobile app follows the same pattern.
export const DEFAULT_SERVER_URL = 'https://search-lcr.vercel.app';

const SERVER_URL_KEY = 'SERVER_URL';
const AUTH_TOKEN_KEY = 'AUTH_TOKEN';

export const storage = {
  // ── Server URL ──────────────────────────────────────────────────────────────
  async setServerUrl(url: string) {
    const normalized = url.trim().replace(/\/$/, '');
    if (!normalized) {
      await SecureStore.deleteItemAsync(SERVER_URL_KEY);
      return;
    }
    await SecureStore.setItemAsync(SERVER_URL_KEY, normalized);
  },

  async getServerUrl(): Promise<string> {
    const saved = await SecureStore.getItemAsync(SERVER_URL_KEY);
    return (saved?.trim().replace(/\/$/, '')) || DEFAULT_SERVER_URL;
  },

  async clearServerUrl() {
    await SecureStore.deleteItemAsync(SERVER_URL_KEY);
  },

  // ── Auth Token ──────────────────────────────────────────────────────────────
  async setToken(token: string) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async removeToken() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
