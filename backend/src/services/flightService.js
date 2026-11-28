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
    const cacheKey = `airport-light:${cleanCode}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getAirportLight(cleanCode);
    const result = {
      name: raw.name,
      iata: raw.iata,
      icao: raw.icao
    };

    setCached(cacheKey, result, 3600 * 1000);
    return { ...result, cached: false };
  },

  async getAirportFullInfo(code) {
    const cleanCode = code.trim().toUpperCase();
    const cacheKey = `airport-full:${cleanCode}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getAirportFull(cleanCode);
    const result = {
      name: raw.name,
      iata: raw.iata,
      icao: raw.icao,
      city: raw.city,
      country: raw.country?.name || raw.country?.code || null,
      lat: raw.lat,
      lon: raw.lon,
      elevationFeet: raw.elevation,
      timezone: raw.timezone?.name || null,
      runwaysCount: Array.isArray(raw.runways) ? raw.runways.length : 0
    };

    setCached(cacheKey, result, 3600 * 1000);
    return { ...result, cached: false };
  },

  async getAirlineInfo(icao) {
    const cleanIcao = icao.trim().toUpperCase();
    const cacheKey = `airline-light:${cleanIcao}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getAirlineLight(cleanIcao);
    const result = {
      name: raw.name,
      iata: raw.iata,
      icao: raw.icao
    };

    setCached(cacheKey, result, 3600 * 1000);
    return { ...result, cached: false };
  },

  async getLiveFlights(query) {
    const safeQuery = { ...query, limit: query.limit || 5 };
    const cacheKey = `live:${JSON.stringify(safeQuery)}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getLivePositionsLight(safeQuery);
    const flights = (raw.data || []).map((item) => ({
      id: item.fr24_id,
      callsign: item.callsign || 'N/A',
      lat: item.lat,
      lon: item.lon,
      altitudeMeters: item.alt ? Math.round(item.alt * 0.3048) : 0,
      speedKmh: item.gspeed ? Math.round(item.gspeed * 1.852) : 0,
      track: item.track,
      squawk: item.squawk || null,
      timestamp: item.timestamp
    }));

    const result = { count: flights.length, flights };
    setCached(cacheKey, result);
    return { ...result, cached: false };
  },

  async getLiveFlightsCount(query) {
    const cacheKey = `live-count:${JSON.stringify(query)}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getLivePositionsCount(query);
    const result = { recordCount: raw.record_count ?? 0 };
    setCached(cacheKey, result);
    return { ...result, cached: false };
  },

  async getFlightSummary(query) {
    // По спецификации FR24: если не переданы flight_ids, обязательны flight_datetime_from и flight_datetime_to (макс. 14 дней)
    const params = { ...query, limit: query.limit || 5 };
    if (!params.flight_ids && (!params.flight_datetime_from || !params.flight_datetime_to)) {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      params.flight_datetime_from = threeDaysAgo.toISOString().replace(/\.\d{3}Z$/, 'Z');
      params.flight_datetime_to = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    const cacheKey = `summary:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getFlightSummaryLight(params);
    const summaries = (raw.data || []).map((item) => ({
      fr24Id: item.fr24_id,
      flight: item.flight || 'N/A',
      callsign: item.callsign || 'N/A',
      aircraftType: item.type || 'N/A',
      registration: item.reg || 'N/A',
      originIcao: item.orig_icao || 'N/A',
      destinationIcao: item.dest_icao || 'N/A',
      takeoffUtc: item.datetime_takeoff || item.first_seen || null,
      landedUtc: item.datetime_landed || item.last_seen || null,
      flightEnded: Boolean(item.flight_ended)
    }));

    const result = { count: summaries.length, summaries };
    setCached(cacheKey, result);
    return { ...result, cached: false };
  },

  async getFlightTrack(flightId) {
    const cleanId = flightId.trim();
    const cacheKey = `track:${cleanId}`;
    const cached = getCached(cacheKey);
    if (cached) return { ...cached, cached: true };

    const raw = await fr24Client.getFlightTracks(cleanId);
    const points = Array.isArray(raw.tracks) ? raw.tracks : [];
    const lastPoint = points.length > 0 ? points[points.length - 1] : null;

    const result = {
      fr24Id: raw.fr24_id || cleanId,
      pointsCount: points.length,
      lastPosition: lastPoint
        ? {
            timestamp: lastPoint.timestamp,
            lat: lastPoint.lat,
            lon: lastPoint.lon,
            altitudeMeters: lastPoint.alt ? Math.round(lastPoint.alt * 0.3048) : 0,
            speedKmh: lastPoint.gspeed ? Math.round(lastPoint.gspeed * 1.852) : 0
          }
        : null
    };

    setCached(cacheKey, result);
    return { ...result, cached: false };
  },

  async getApiUsage(period = '24h') {
    return fr24Client.getUsage(period);
  }
};
