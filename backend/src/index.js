import express from 'express';
import { config } from './config/env.js';
import flightsRouter from './routes/flights.routes.js';

const app = express();
app.use(express.json());

// Проверка здоровья сервиса и режима FR24
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    fr24Mode: config.fr24.baseUrl.includes('/sandbox') ? 'sandbox' : 'production',
    timestamp: new Date().toISOString()
  });
});

// Общая информация об API (сохраняем обратную совместимость)
app.get('/api/v1/info', (req, res) => {
  res.json({
    version: 'v1',
    message: 'API ready for Web and Telegram clients',
    endpoints: ['/api/health', '/api/v1/info', '/api/v1/flights/airports/:code', '/api/v1/flights/live', '/api/v1/flights/usage']
  });
});

// Модуль интеграции с Flightradar24 API
app.use('/api/v1/flights', flightsRouter);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Backend API listening on port ${config.port}`);
});
