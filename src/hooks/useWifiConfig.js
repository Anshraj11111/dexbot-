/**
 * useWifiConfig — manages WiFi status fetching and configuration for a bot.
 * Uses a fresh axios instance per IP to avoid the cached-baseURL problem.
 */
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * @param {string} botId  (unused for requests, kept for API consistency)
 * @param {string} ip     The device IP — may be a manual override
 */
export function useWifiConfig(botId, ip) {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [error, setError] = useState('');

  // Always create a fresh client from the current IP — never use the cached instance
  const getClient = useCallback(() => {
    if (!ip) throw new Error('No IP address. Enter the device IP above.');
    return axios.create({
      baseURL: `http://${ip}`,
      timeout: 10_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }, [ip]);

  /** GET /api/wifi */
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError('');
    try {
      const res = await getClient().get('/api/wifi');
      const data = res.data;
      const normalized = {
        connected: data.connected ?? false,
        ssid: data.ssid ?? '',
        ip: data.ip ?? '',
        apMode: !data.connected,
        mac: data.mac ?? '',
        rssi: data.rssi ?? 0,
        strength: data.strength ?? 0,
      };
      setStatus(normalized);
      return normalized;
    } catch (err) {
      const msg = classifyError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoadingStatus(false);
    }
  }, [getClient]);

  /** POST /api/wifi/update  { ssid, password } */
  const saveWifi = useCallback(async (ssid, password) => {
    setLoadingSave(true);
    setError('');
    try {
      // Use XMLHttpRequest — more reliable with ESP32 WebServer CORS handling
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `http://${ip}/api/wifi/update`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 10000;
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            let errMsg = `${xhr.status}`;
            try { errMsg = JSON.parse(xhr.responseText)?.error || errMsg; } catch {}
            reject({ status: xhr.status, message: errMsg });
          }
        };
        xhr.onerror = () => reject({ status: 0, code: 'ERR_NETWORK', message: 'Network error' });
        xhr.ontimeout = () => reject({ code: 'ECONNABORTED', message: 'Request timed out' });
        xhr.send(JSON.stringify({ ssid, password }));
      });
    } catch (err) {
      const msg = classifyError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoadingSave(false);
    }
  }, [ip]);

  /** GET /api/wifi (test without saving) */
  const testConnection = useCallback(async () => {
    setLoadingTest(true);
    setError('');
    try {
      const res = await getClient().get('/api/wifi');
      const data = res.data;
      const normalized = {
        connected: data.connected ?? false,
        ssid: data.ssid ?? '',
        ip: data.ip ?? '',
        apMode: !data.connected,
        rssi: data.rssi ?? 0,
      };
      setStatus(normalized);
      return normalized;
    } catch (err) {
      const msg = classifyError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoadingTest(false);
    }
  }, [getClient]);

  /** POST /api/wifi/reset */
  const resetWifi = useCallback(async () => {
    setLoadingReset(true);
    setError('');
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `http://${ip}/api/wifi/reset`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 10000;
        xhr.onload = () => xhr.status < 300 ? resolve() : reject({ status: xhr.status });
        xhr.onerror = () => reject({ status: 0, code: 'ERR_NETWORK' });
        xhr.ontimeout = () => reject({ code: 'ECONNABORTED' });
        xhr.send('{}');
      });
      setStatus(null);
    } catch (err) {
      const msg = classifyError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoadingReset(false);
    }
  }, [ip]);

  return {
    status,
    loadingStatus,
    loadingSave,
    loadingTest,
    loadingReset,
    error,
    fetchStatus,
    saveWifi,
    testConnection,
    resetWifi,
  };
}

function classifyError(err) {
  // Axios wraps errors differently — handle both raw axios and our normalized format
  const status = err?.response?.status ?? err?.status ?? 0;
  const code = err?.code ?? '';
  const message = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? '';

  if (code === 'ECONNABORTED' || message.includes('timeout')) {
    return 'Request timed out. Make sure you are connected to A5X_Industries WiFi.';
  }
  if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || status === 0) {
    return 'Device unreachable. Connect to A5X_Industries WiFi first, then try again.';
  }
  if (status === 400) {
    return `Bad request (400): ${message || 'Check SSID and password fields.'}`;
  }
  if (status === 404) return 'Endpoint not found on device.';
  if (status === 401 || status === 403) return 'Permission denied.';
  if (status >= 500) return 'Device server error. Try again.';
  if (message) return message;
  return 'Network error. Check your WiFi connection.';
}
