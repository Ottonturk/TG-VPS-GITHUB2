import { Bot } from 'grammy';
import { backendClient } from './backendClient.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

function formatApiError(err, notFoundText) {
  if (err.status === 404) return notFoundText;
  if (err.status === 402) return 'Исчерпан лимит кредитов Flightradar24 API.';
  if (err.status === 400) return `Некорректный параметр запроса: ${err.details || err.message}`;
  return `Ошибка API (${err.status || 500}): ${err.message}`;
}

if (!token || token === 'your_token_here') {
  console.log('TELEGRAM_BOT_TOKEN not set. Bot running in standby mode.');
  setInterval(() => {}, 60000);
} else {
  const bot = new Bot(token);

  const helpText = [
    'Доступные команды Flightradar24:',
    '/airport <IATA/ICAO> — краткая инфо об аэропорте (напр. /airport ESSA)',
    '/airport_full <IATA/ICAO> — подробная инфо об аэропорте (напр. /airport_full WAW)',
    '/airline <ICAO> — инфо об авиакомпании (напр. /airline AFL)',
    '/live <номер_рейса> — позиция рейса в воздухе (напр. /live AF1463)',
    '/count <north,south,west,east> — кол-во бортов в зоне (напр. /count 50.68,46.21,14.42,22.24)',
    '/flight <номер_рейса> — сводка по рейсу (напр. /flight EK184)',
    '/track <fr24_id> — трек полёта по ID (напр. /track 34242a02)',
    '/usage — расход кредитов API за 24 часа'
  ].join('\n');

  bot.command('start', async (ctx) => {
    try {
      const health = await backendClient.getHealth();
      await ctx.reply(
        `Бот на связи!\nСтатус бэкенда: ${health.status}\nТокен FR24 настроен: ${health.fr24Configured ? 'да' : 'нет'}\n\n${helpText}`
      );
    } catch {
      await ctx.reply('Бот работает, но бэкенд пока недоступен.');
    }
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(helpText);
  });

  bot.command('airport', async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) return ctx.reply('Укажите код аэропорта, например: /airport ESSA');
    try {
      const a = await backendClient.getAirport(code);
      await ctx.reply(`Аэропорт: ${a.name}\nIATA: ${a.iata || '—'} | ICAO: ${a.icao || '—'}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, `Аэропорт «${code.toUpperCase()}» не найден.`));
    }
  });

  bot.command('airport_full', async (ctx) => {
    const code = ctx.match?.trim();
    if (!code) return ctx.reply('Укажите код аэропорта, например: /airport_full WAW');
    try {
      const a = await backendClient.getAirportFull(code);
      await ctx.reply(
        [
          `Аэропорт: ${a.name} (${a.iata || '—'} / ${a.icao || '—'})`,
          `Город / Страна: ${a.city || '—'}, ${a.country || '—'}`,
          `Координаты: ${a.lat}, ${a.lon} (высота ${a.elevationFeet ?? '—'} ft)`,
          `Часовой пояс: ${a.timezone || '—'} | ВПП: ${a.runwaysCount}`
        ].join('\n')
      );
    } catch (err) {
      await ctx.reply(formatApiError(err, `Аэропорт «${code.toUpperCase()}» не найден.`));
    }
  });

  bot.command('airline', async (ctx) => {
    const icao = ctx.match?.trim();
    if (!icao) return ctx.reply('Укажите ICAO код авиакомпании, например: /airline AFL');
    try {
      const airline = await backendClient.getAirline(icao);
      await ctx.reply(`Авиакомпания: ${airline.name}\nIATA: ${airline.iata || '—'} | ICAO: ${airline.icao || '—'}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, `Авиакомпания «${icao.toUpperCase()}» не найдена.`));
    }
  });

  bot.command('live', async (ctx) => {
    const flight = ctx.match?.trim().toUpperCase();
    if (!flight) return ctx.reply('Укажите номер рейса, например: /live AF1463');
    try {
      const res = await backendClient.getLiveFlights({ flights: flight });
      if (!res.flights.length) {
        return ctx.reply(`Рейс ${flight} сейчас не в воздухе или не найден.`);
      }
      const lines = res.flights.map(
        (f) => `• ${f.callsign} (ID: ${f.id}): высота ${f.altitudeMeters} м, скорость ${f.speedKmh} км/ч, курс ${f.track}°, [${f.lat}, ${f.lon}]`
      );
      await ctx.reply(`Активные борты (${res.count}):\n${lines.join('\n')}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, `Рейс «${flight}» не найден.`));
    }
  });

  bot.command('count', async (ctx) => {
    const bounds = ctx.match?.trim();
    if (!bounds) return ctx.reply('Укажите границы (north,south,west,east), например:\n/count 50.682,46.218,14.422,22.243');
    try {
      const res = await backendClient.getLiveCount({ bounds });
      await ctx.reply(`Количество бортов в заданной зоне: ${res.recordCount}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, 'Данные по координатам не найдены.'));
    }
  });

  bot.command('flight', async (ctx) => {
    const flight = ctx.match?.trim().toUpperCase();
    if (!flight) return ctx.reply('Укажите номер рейса, например: /flight EK184');
    try {
      const res = await backendClient.getFlightSummary({ flights: flight });
      if (!res.summaries.length) {
        return ctx.reply(`Сводка по рейсу ${flight} за последние 3 дня не найдена.`);
      }
      const lines = res.summaries.map(
        (s) => `• ${s.flight} (${s.callsign}, борт ${s.aircraftType} ${s.registration}): ${s.originIcao} -> ${s.destinationIcao} | Вылет: ${s.takeoffUtc || '—'} | ID: ${s.fr24Id}`
      );
      await ctx.reply(`Найдено рейсов (${res.count}):\n${lines.join('\n')}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, `Рейс «${flight}» не найден.`));
    }
  });

  bot.command('track', async (ctx) => {
    const flightId = ctx.match?.trim();
    if (!flightId) return ctx.reply('Укажите fr24_id рейса, например: /track 34242a02');
    try {
      const t = await backendClient.getFlightTrack(flightId);
      const pos = t.lastPosition
        ? `Последняя точка (${t.lastPosition.timestamp}): [${t.lastPosition.lat}, ${t.lastPosition.lon}], высота ${t.lastPosition.altitudeMeters} м, скорость ${t.lastPosition.speedKmh} км/ч`
        : 'Координаты трека отсутствуют';
      await ctx.reply(`Трек рейса ${t.fr24Id}:\nВсего точек: ${t.pointsCount}\n${pos}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, `Трек для ID «${flightId}» не найден.`));
    }
  });

  bot.command('usage', async (ctx) => {
    try {
      const u = await backendClient.getUsage('24h');
      const items = u.data || [];
      if (!items.length) return ctx.reply('За последние 24 часа запросов к API не зафиксировано.');
      const lines = items.map((i) => `• ${i.endpoint}: ${i.request_count} запр. (${i.credits} кредитов)`);
      await ctx.reply(`Расход API за 24ч:\n${lines.join('\n')}`);
    } catch (err) {
      await ctx.reply(formatApiError(err, 'Статистика использования недоступна.'));
    }
  });

  bot.catch((err) => {
    console.error('Telegram Bot error:', err.error);
  });

  bot.start();
  console.log('Telegram bot started via Long Polling');
}
