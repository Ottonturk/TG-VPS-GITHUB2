export const config = {
  port: Number(process.env.PORT) || 3000,
  fr24: {
    baseUrl: (process.env.FR24_API_BASE_URL || 'https://flightradar24.com').replace(/\/$/, ''),
    token: process.env.FR24_API_TOKEN || '',
    timeoutMs: 10000,
    cacheTtlMs: 60000 // Кэшируем ответы на 60 секунд для экономии кредитов
  }
};
