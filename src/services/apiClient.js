/**
 * Per-device Axios instance manager.
 * Each registered robot gets its own Axios instance keyed by botId.
 * Requirements: 14.3, 14.6
 */
import axios from 'axios';

/** @type {Map<string, import('axios').AxiosInstance>} */
const instances = new Map();

/**
 * Returns (or creates) an Axios instance for the given robot.
 * @param {string} botId
 * @param {string} baseURL - e.g. "http://192.168.1.42"
 * @returns {import('axios').AxiosInstance}
 */
export function getApiClient(botId, baseURL) {
  if (instances.has(botId)) return instances.get(botId);

  const client = axios.create({
    baseURL,
    timeout: 10_000, // 10 seconds per Req 14.6
  });

  // Response interceptor — normalize all errors to { message, status, code }
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const normalized = {
        message: err.response?.data?.message ?? err.message ?? 'Unknown error',
        status: err.response?.status ?? 0,
        code: err.code ?? 'UNKNOWN',
      };
      return Promise.reject(normalized);
    }
  );

  instances.set(botId, client);
  return client;
}

/**
 * Removes the Axios instance for the given robot (e.g. when deregistered).
 * @param {string} botId
 */
export function removeApiClient(botId) {
  instances.delete(botId);
}

/**
 * Returns all currently registered botIds that have an Axios instance.
 * @returns {string[]}
 */
export function getRegisteredClientIds() {
  return Array.from(instances.keys());
}
