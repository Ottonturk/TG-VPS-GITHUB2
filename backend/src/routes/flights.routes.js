import { Router } from 'express';
import { flightService } from '../services/flightService.js';
import { Fr24ApiError } from '../clients/fr24Client.js';

const router = Router();

function handleError(res, err) {
  if (err instanceof Fr24ApiError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details
    });
  }
  console.error('Unexpected error in flights route:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

// GET /api/v1/flights/airports/:code
router.get('/airports/:code', async (req, res) => {
  try {
    const data = await flightService.getAirportInfo(req.params.code);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/airports/:code/full
router.get('/airports/:code/full', async (req, res) => {
  try {
    const data = await flightService.getAirportFullInfo(req.params.code);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/airlines/:icao
router.get('/airlines/:icao', async (req, res) => {
  try {
    const data = await flightService.getAirlineInfo(req.params.icao);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/live?flights=AF1463 или ?bounds=...
router.get('/live', async (req, res) => {
  try {
    const { bounds, flights, callsigns, airports, routes, limit } = req.query;
    if (!bounds && !flights && !callsigns && !airports && !routes) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Provide at least one filter: bounds, flights, callsigns, airports, or routes'
      });
    }
    const data = await flightService.getLiveFlights({ bounds, flights, callsigns, airports, routes, limit });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/live/count?bounds=...
router.get('/live/count', async (req, res) => {
  try {
    const { bounds, flights, callsigns, airports, routes } = req.query;
    if (!bounds && !flights && !callsigns && !airports && !routes) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Provide at least one filter: bounds, flights, callsigns, airports, or routes'
      });
    }
    const data = await flightService.getLiveFlightsCount({ bounds, flights, callsigns, airports, routes });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/summary?flights=EK184 или ?flight_ids=391fdd79
router.get('/summary', async (req, res) => {
  try {
    const { flight_ids, flights, callsigns, airports, routes, flight_datetime_from, flight_datetime_to, limit } = req.query;
    if (!flight_ids && !flights && !callsigns && !airports && !routes) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Provide flight_ids or at least one filter (flights, callsigns, airports, routes)'
      });
    }
    const data = await flightService.getFlightSummary({
      flight_ids,
      flights,
      callsigns,
      airports,
      routes,
      flight_datetime_from,
      flight_datetime_to,
      limit
    });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/tracks/:flightId
router.get('/tracks/:flightId', async (req, res) => {
  try {
    const data = await flightService.getFlightTrack(req.params.flightId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/usage?period=24h
router.get('/usage', async (req, res) => {
  try {
    const data = await flightService.getApiUsage(req.query.period || '24h');
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
