/** Thin wrapper around fetch for the Flask API. All network calls go through here. */

// No VITE_API_URL set: use the local Flask server while developing, and no
// server at all in a production build (data is then saved in the browser).
const DEFAULT_URL = import.meta.env.DEV ? 'http://localhost:5000' : '';
const BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_URL).replace(/\/$/, '');

/** With VITE_API_URL set to an empty string the app runs fully on this device. */
export const API_ENABLED = BASE_URL !== '';
const TOKEN = import.meta.env.VITE_API_TOKEN ?? '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  if (!API_ENABLED) throw new ApiError('No server configured.', 0);
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message ?? 'Request failed.', response.status);
  return data;
}

export const api = {
  getSettings: () => request('/settings'),
  saveSettings: (settings) => request('/settings', { method: 'PUT', body: settings }),
  getDays: () => request('/days'),
  patchDay: (dateKey, patch) => request(`/days/${dateKey}`, { method: 'PATCH', body: patch }),
  deleteDays: () => request('/days', { method: 'DELETE' }),
  getTopics: () => request('/topics'),
  saveTopic: (topic) => request(`/topics/${topic.id}`, { method: 'PUT', body: topic }),
  deleteTopic: (id) => request(`/topics/${id}`, { method: 'DELETE' }),
  getWeekReport: (index) => request(`/reports/week/${index}`),
  getOverallReport: (today) => request(`/reports/overall?today=${today}`),
};
