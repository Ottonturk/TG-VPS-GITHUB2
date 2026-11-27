import { Bot } from 'grammy';
import { backendClient } from './backendClient.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token || token === 'your_token_here') {
  console.log('TELEGRAM_BOT_TOKEN not set. Bot running in standby mode.');
  setInterval(() => {}, 60000);
} else {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    try {
      const health = await backendClient.getHealth();
      await ctx.reply(
        `Бот на связи!\nСтатус бэкенда: ${health.status}\nРежим FR24: ${health.fr24Mode}`
      );
    } catch {
      await ctx.reply('Бот работает, но бэкенд пока недоступен.');
    }
  });

  // Тестовая команда для проверки интеграции с Flightradar24 Sandbox (например: /airport WAW)
  bot.command('airport', async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) {
      return ctx.reply('Укажите код аэропорта (IATA или ICAO), например:\n/airport WAW');
    }
    try {
      const airport = await backendClient.getAirport(code);
      await ctx.reply(
        `Аэропорт: ${airport.name}\nIATA: ${airport.iata || '—'} | ICAO: ${airport.icao || '—'}`
      );
    } catch (err) {
      if (err.status === 404) {
        await ctx.reply(`Аэропорт «${code.toUpperCase()}» не найден.`);
      } else {
        await ctx.reply(`Ошибка при запросе к API: ${err.message}`);
      }
    }
  });

  // Защита от падения процесса при ошибках в публичном чате
  bot.catch((err) => {
    console.error('Telegram Bot error:', err.error);
  });

  bot.start();
  console.log('Telegram bot started via Long Polling');
}
