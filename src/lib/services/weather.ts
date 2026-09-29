import "server-only";
import type { WeatherSnapshot } from "@/lib/db/schema";

/**
 * Weather from Open-Meteo (free, no API key). Cached in memory for 15 minutes.
 * Set WEATHER_MOCK=1 to use sample data (offline demos).
 */

export type Weather = {
  current: { temperature: number; apparent: number; code: number; label: string; isDay: boolean; wind: number; humidity: number };
  hourly: Array<{ time: string; temperature: number; code: number; precipitation: number }>;
  today: { max: number; min: number; sunrise: string; sunset: string; uvMax: number; precipitationSum: number };
  fetchedAt: string;
};

const TTL = 15 * 60_000;
const cache = new Map<string, { at: number; data: Weather }>();

/** WMO weather interpretation codes → label. */
const CODES: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers",
  82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

export const weatherLabel = (code: number) => CODES[code] ?? "—";

export async function getWeather(lat: number | null, lon: number | null): Promise<Weather | null> {
  if (process.env.WEATHER_MOCK === "1") return mockWeather();
  if (lat == null || lon == null) return null;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum",
    timezone: "auto",
    forecast_days: "2",
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return hit?.data ?? null;
    const data = parseForecast(await res.json());
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return hit?.data ?? null;
  }
}

type Forecast = {
  current: Record<string, number>;
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[] };
  daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[]; precipitation_sum: number[] };
};

export function parseForecast(json: Forecast): Weather {
  const c = json.current;
  const nowHour = String(json.current.time ?? "").slice(0, 13);
  const start = Math.max(0, json.hourly.time.findIndex((t) => t.slice(0, 13) >= nowHour));
  const hourly = json.hourly.time.slice(start, start + 24).map((time, i) => ({
    time,
    temperature: json.hourly.temperature_2m[start + i],
    code: json.hourly.weather_code[start + i],
    precipitation: json.hourly.precipitation_probability?.[start + i] ?? 0,
  }));
  return {
    current: {
      temperature: c.temperature_2m,
      apparent: c.apparent_temperature,
      code: c.weather_code,
      label: weatherLabel(c.weather_code),
      isDay: c.is_day === 1,
      wind: c.wind_speed_10m,
      humidity: c.relative_humidity_2m,
    },
    hourly,
    today: {
      max: json.daily.temperature_2m_max[0],
      min: json.daily.temperature_2m_min[0],
      sunrise: json.daily.sunrise[0],
      sunset: json.daily.sunset[0],
      uvMax: json.daily.uv_index_max[0],
      precipitationSum: json.daily.precipitation_sum[0],
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function snapshot(w: Weather | null): WeatherSnapshot | null {
  if (!w) return null;
  return { temperature: w.current.temperature, code: w.current.code, label: w.current.label, isDay: w.current.isDay };
}

export type Place = { name: string; country: string; admin1?: string; latitude: number; longitude: number };

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (process.env.WEATHER_MOCK === "1") return [{ name: "Berlin", country: "Germany", admin1: "Berlin", latitude: 52.52, longitude: 13.41 }];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: "6", language: "en", format: "json" })}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Place[] };
    return (json.results ?? []).map((r) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch {
    return [];
  }
}

function mockWeather(): Weather {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now.getTime() + i * 3_600_000);
    const h = t.getHours();
    return {
      time: `${day}T${pad(h)}:00`,
      temperature: Math.round((14 + 6 * Math.sin(((h - 9) / 24) * 2 * Math.PI)) * 10) / 10,
      code: h > 15 && h < 19 ? 61 : h % 5 === 0 ? 2 : 1,
      precipitation: h > 15 && h < 19 ? 60 : 5,
    };
  });
  return {
    current: { temperature: 17.4, apparent: 16.8, code: 2, label: weatherLabel(2), isDay: now.getHours() > 6 && now.getHours() < 19, wind: 9, humidity: 58 },
    hourly,
    today: { max: 20, min: 9, sunrise: `${day}T07:02`, sunset: `${day}T18:51`, uvMax: 3.4, precipitationSum: 1.2 },
    fetchedAt: now.toISOString(),
  };
}
