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

// GET /api/v1/flights/airports/:code (например /api/v1/flights/airports/WAW)
router.get('/airports/:code', async (req, res) => {
  try {
    const data = await flightService.getAirportInfo(req.params.code);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/v1/flights/live?bounds=50.682,46.218,14.422,22.243 или ?flights=AF1463
router.get('/live', async (req, res) => {
  try {
    const { bounds, flights, callsigns, airports, limit } = req.query;
    if (!bounds && !flights && !callsigns && !airports) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Provide at least one filter: bounds, flights, callsigns, or airports'
      });
    }
    const data = await flightService.getLiveFlights({ bounds, flights, callsigns, airports, limit });
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
