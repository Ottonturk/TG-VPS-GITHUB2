import { fr24Client } from '../clients/fr24Client.js';
import { config } from '../config/env.js';

const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = config.fr24.cacheTtlMs) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const flightService = {
  async getAirportInfo(code) {
    const cleanCode = code.trim().toUpperCase();
    const cacheKey = `airport:${cleanCode}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getAirportLight(cleanCode);
    const result = {
      name: raw.name,
      iata: raw.iata,
      icao: raw.icao
    };

    setCached(cacheKey, result, 3600 * 1000); // Справочник аэропортов кэшируем на 1 час
    return { ...result, cached: false };
  },

  async getLiveFlights(query) {
    const cacheKey = `live:${JSON.stringify(query)}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getLivePositionsLight(query);
    const flights = (raw.data || []).map((item) => ({
      id: item.fr24_id,
      callsign: item.callsign || 'N/A',
      lat: item.lat,
      lon: item.lon,
      altitudeMeters: item.alt ? Math.round(item.alt * 0.3048) : 0, // футы -> метры
      speedKmh: item.gspeed ? Math.round(item.gspeed * 1.852) : 0,   // узлы -> км/ч
      track: item.track,
      timestamp: item.timestamp
    }));

    const result = { count: flights.length, flights };
    setCached(cacheKey, result);
    return { ...result, cached: false };
  },

  async getApiUsage(period = '24h') {
    return fr24Client.getUsage(period);
  }
};
