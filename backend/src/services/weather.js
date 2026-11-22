import { fetchWeatherApi } from 'openmeteo';
import { ipv4Dispatcher, ipv4Fetch } from '../lib/network.js';

const weatherCache = new Map();
const locationCache = new Map();
const cacheDuration = 15 * 60 * 1000;
const forecastUrl = 'https://api.open-meteo.com/v1/forecast';
const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
const timestampRange = (start, end, step) => Array.from({ length: Math.max(0, (end - start) / step) }, (_, index) => start + index * step);
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGeocoding(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchWithTimeout(url, {}, 8000);
    } catch (error) {
      lastError = error;
      if (attempt < 1) await pause(200);
    }
  }
  throw lastError;
}

async function geocode(location, context = {}) {
  const key = `${location.trim().toLowerCase()}|${context.district||''}|${context.province||''}`.toLowerCase();
  if (locationCache.has(key)) return locationCache.get(key);
  const url = new URL(geocodingUrl);
  url.searchParams.set('name', location);
  url.searchParams.set('count', '10');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('countryCode', 'RW');
  const response = await fetchGeocoding(url);
  if (!response.ok) throw new Error(`Open-Meteo geocoding returned ${response.status}.`);
  const result = await response.json();
  const matches = (result.results || []).filter(item => item.country_code === 'RW');
  const normalized = value => String(value || '').trim().toLowerCase().replace(/^city of /, '').replace(/\b(district|province|city)\b/g, '').replace(/\s+/g, ' ').trim();
  const inProvince = item => !context.province || [item.admin1, item.admin2, item.admin3, item.admin4].some(value => normalized(value) === normalized(context.province));
  const inDistrict = item => !context.district || [item.admin1, item.admin2, item.admin3, item.admin4].some(value => normalized(value) === normalized(context.district));
  const found = matches.find(item => inProvince(item) && inDistrict(item));
  if (!found) return null;
  const coordinates = { latitude: found.latitude, longitude: found.longitude, resolvedName: [found.name, found.admin2, found.admin1].filter(Boolean).join(', ') };
  locationCache.set(key, coordinates);
  return coordinates;
}

export async function resolveLocation(locations) {
  const names = locations.filter(Boolean);
  const context = { province: names.find(name => /province|kigali/i.test(name) && name !== 'Rwanda'), district: names.length > 2 ? names[1] : '' };
  let resolved;
  // Try only the first 3 locations to avoid too many geocoding calls
  for (const location of names.slice(0, 3)) {
    resolved = await geocode(location, context);
    if (resolved) break;
  }
  if (!resolved) throw Object.assign(new Error('Could not find this Rwanda sector or district in Open-Meteo location search.'), { status: 404 });
  return resolved;
}

async function fetchWeatherWithTimeout(url, params, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchWeatherApi(url, params, 3, 0.2, 2, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getFourDayForecast(locations) {
  const resolved = await resolveLocation(locations);
  const cacheKey = `${resolved.latitude},${resolved.longitude}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const params = {
    latitude: [resolved.latitude],
    longitude: [resolved.longitude],
    timezone: 'Africa/Kigali',
    forecast_days: 4,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,precipitation,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
  };

  const responses = await fetchWeatherWithTimeout(forecastUrl, params, { dispatcher: ipv4Dispatcher });
  const response = responses[0];
  if (!response) throw new Error('Open-Meteo returned no forecast data.');
  const offset = response.utcOffsetSeconds();
  const current = response.current();
  const hourly = response.hourly();
  const daily = response.daily();
  const currentValue = (index) => current?.variables(index)?.value() ?? null;
  const hourlyValues = index => hourly?.variables(index)?.valuesArray() || [];
  const dailyValues = index => daily?.variables(index)?.valuesArray() || [];
  const hourlyTimes = hourly ? timestampRange(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()) : [];
  const dailyTimes = daily ? timestampRange(Number(daily.time()), Number(daily.timeEnd()), daily.interval()) : [];
  const data = {
    location: resolved,
    timezone: response.timezone(),
    current: {
      time: current ? new Date((Number(current.time()) + offset) * 1000).toISOString() : null,
      temperature: currentValue(0), humidity: currentValue(1), feelsLike: currentValue(2), isDay: Boolean(currentValue(3)),
      precipitation: currentValue(4), weatherCode: currentValue(5), windSpeed: currentValue(6),
    },
    forecast: dailyTimes.map((time, index) => ({
      date: new Date((time + offset) * 1000).toISOString().slice(0, 10),
      weatherCode: dailyValues(0)[index], temperatureMax: dailyValues(1)[index], temperatureMin: dailyValues(2)[index],
      precipitationProbability: dailyValues(3)[index], precipitation: dailyValues(4)[index], windSpeedMax: dailyValues(5)[index],
    })),
    hourly: hourlyTimes.map((time, index) => ({ time: new Date((time + offset) * 1000).toISOString(), temperature: hourlyValues(0)[index], precipitationProbability: hourlyValues(1)[index], precipitation: hourlyValues(2)[index], humidity: hourlyValues(3)[index] })),
    attribution: 'Weather data by Open-Meteo.com',
  };
  weatherCache.set(cacheKey, { data, expiresAt: Date.now() + cacheDuration });
  return data;
}
