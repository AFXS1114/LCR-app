import * as SecureStore from 'expo-secure-store';

const SERVER_IP_KEY = 'SERVER_IP';
const SERVER_PORT_KEY = 'SERVER_PORT';
const AUTH_TOKEN_KEY = 'AUTH_TOKEN';

export const storage = {
  // Server Configuration
  async setServerConfig(ip: string, port: string) {
    await SecureStore.setItemAsync(SERVER_IP_KEY, ip);
    await SecureStore.setItemAsync(SERVER_PORT_KEY, port);
  },

  async getServerConfig() {
    const ip = await SecureStore.getItemAsync(SERVER_IP_KEY);
    const port = await SecureStore.getItemAsync(SERVER_PORT_KEY);
    return { ip, port };
  },

  // Auth Token
  async setToken(token: string) {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },

  async getToken() {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async removeToken() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },
};
