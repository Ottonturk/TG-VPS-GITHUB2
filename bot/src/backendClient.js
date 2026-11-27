const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

async function fetchBackend(path) {
  const response = await fetch(`${BACKEND_URL}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Backend HTTP ${response.status}`);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const backendClient = {
  getHealth: () => fetchBackend('/api/health'),
  getAirport: (code) => fetchBackend(`/api/v1/flights/airports/${encodeURIComponent(code)}`),
  getLiveFlights: (queryParams) => {
    const qs = new URLSearchParams(queryParams).toString();
    return fetchBackend(`/api/v1/flights/live?${qs}`);
  }
};
