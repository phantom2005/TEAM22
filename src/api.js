const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const api = {
  analyze: (incident_description) =>
    request('POST', '/analyze', { incident_description }),

  getAnalyses: (skip = 0, limit = 20) =>
    request('GET', `/analyses?skip=${skip}&limit=${limit}`),

  getAnalytics: () =>
    request('GET', '/analytics'),

  submitFeedback: (analysis_id, was_accurate, rating, comment) =>
    request('POST', '/feedback', { analysis_id, was_accurate, rating, comment }),

  getHealth: () =>
    request('GET', '/health'),
};
