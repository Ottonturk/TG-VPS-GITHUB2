import { config } from '../config/env.js';

export class Fr24ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'Fr24ApiError';
    this.status = status;
    this.details = details;
  }
}

export class Fr24Client {
  constructor({ baseUrl = config.fr24.baseUrl, token = config.fr24.token, timeoutMs = config.fr24.timeoutMs } = {}) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.timeoutMs = timeoutMs;
  }

  async request(endpoint, queryParams = {}) {
    if (!this.token || this.token === 'your_fr24_sandbox_token_here') {
      throw new Fr24ApiError(503, 'FR24_API_TOKEN is not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Version': 'v1',
          'Authorization': `Bearer ${this.token}`
        },
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Fr24ApiError(
          response.status,
          data.message || `FR24 API error (${response.status})`,
          data.details || null
        );
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Fr24ApiError(504, 'Flightradar24 API request timeout');
      }
      if (error instanceof Fr24ApiError) {
        throw error;
      }
      throw new Fr24ApiError(502, 'Failed to connect to Flightradar24 API', error.message);
    } finally {
      clearTimeout(timer);
    }
  }

  // Методы согласно OpenAPI спецификации:
  getAirportLight(code) {
    return this.request(`/static/airports/${encodeURIComponent(code.toUpperCase())}/light`);
  }

  getAirportFull(code) {
    return this.request(`/static/airports/${encodeURIComponent(code.toUpperCase())}/full`);
  }

  getAirlineLight(icao) {
    return this.request(`/static/airlines/${encodeURIComponent(icao.toUpperCase())}/light`);
  }

  getLivePositionsLight(params) {
    // params: { bounds, flights, callsigns, registrations, airports, routes, limit }
    return this.request('/live/flight-positions/light', params);
  }

  getFlightSummaryLight(params) {
    // params: { flight_ids, flights, flight_datetime_from, flight_datetime_to, limit }
    return this.request('/flight-summary/light', params);
  }

  getUsage(period = '24h') {
    return this.request('/usage', { period });
  }
}

export const fr24Client = new Fr24Client();
