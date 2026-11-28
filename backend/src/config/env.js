const DEFAULT_FR24_URL = 'https://' + 'fr24api.flightradar24.com' + '/api';

export const config = {
  port: Number(process.env.PORT) || 3000,
  fr24: {
    baseUrl: (process.env.FR24_API_BASE_URL || DEFAULT_FR24_URL).replace(/\/$/, ''),
    token: process.env.FR24_API_TOKEN || '',
    timeoutMs: 10000,
    cacheTtlMs: 60000
  }
};
