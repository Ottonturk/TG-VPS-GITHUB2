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
  getAirportFull: (code) => fetchBackend(`/api/v1/flights/airports/${encodeURIComponent(code)}/full`),
  getAirline: (icao) => fetchBackend(`/api/v1/flights/airlines/${encodeURIComponent(icao)}`),
  getLiveFlights: (queryParams) => {
    const qs = new URLSearchParams(queryParams).toString();
    return fetchBackend(`/api/v1/flights/live?${qs}`);
  },
  getLiveCount: (queryParams) => {
    const qs = new URLSearchParams(queryParams).toString();
    return fetchBackend(`/api/v1/flights/live/count?${qs}`);
  },
  getFlightSummary: (queryParams) => {
    const qs = new URLSearchParams(queryParams).toString();
    return fetchBackend(`/api/v1/flights/summary?${qs}`);
  },
  getFlightTrack: (flightId) => fetchBackend(`/api/v1/flights/tracks/${encodeURIComponent(flightId)}`),
  getUsage: (period = '24h') => fetchBackend(`/api/v1/flights/usage?period=${encodeURIComponent(period)}`)
};
