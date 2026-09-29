import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, MapPin, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/services/profile";
import { getWeather } from "@/lib/services/weather";

export function WeatherIcon({ code, isDay = true, className }: { code: number; isDay?: boolean; className?: string }) {
  const Icon =
    code === 0 ? (isDay ? Sun : Moon) : code <= 2 ? CloudSun : code === 3 ? Cloud : code <= 48 ? CloudFog : code <= 57 ? CloudDrizzle : code <= 67 || (code >= 80 && code <= 82) ? CloudRain : code <= 86 ? CloudSnow : CloudLightning;
  return <Icon className={className} strokeWidth={1.75} />;
}

/** Current weather + next hours (Open-Meteo), with a nudge toward daylight when it's nice out. */
export async function WeatherCard() {
  const profile = await getProfile();
  const weather = await getWeather(profile.latitude, profile.longitude);

  if (!weather) {
    return (
      <Card title="Weather" className="h-full">
        <p className="text-[13px] text-fg-muted">
          {profile.latitude == null ? (
            <>
              <Link href="/settings" className="inline-flex items-center gap-1 text-primary">
                <MapPin className="size-3.5" /> Set your location
              </Link>{" "}
              to see weather and get daylight nudges.
            </>
          ) : (
            "Weather is unavailable right now."
          )}
        </p>
      </Card>
    );
  }

  const c = weather.current;
  const nice = c.isDay && [0, 1, 2].includes(c.code) && c.temperature >= 8 && c.temperature <= 30;
  return (
    <Card title={profile.locationName ?? "Weather"} className="h-full">
      <div className="flex items-center gap-3">
        <WeatherIcon code={c.code} isDay={c.isDay} className="size-11 text-accent" />
        <div>
          <div className="text-[30px] leading-none font-semibold tracking-tight">{Math.round(c.temperature)}°</div>
          <div className="text-[12.5px] text-fg-muted">
            {c.label} · H {Math.round(weather.today.max)}° L {Math.round(weather.today.min)}°
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between">
        {weather.hourly.slice(1, 7).map((h) => (
          <div key={h.time} className="flex flex-col items-center gap-1 text-[11px] text-fg-muted">
            <span className="tabular">{h.time.slice(11, 13)}</span>
            <WeatherIcon code={h.code} className="size-4" />
            <span className="font-medium text-fg">{Math.round(h.temperature)}°</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 text-[11.5px] text-fg-muted">
        <span className="flex items-center gap-1">
          <Sunrise className="size-3.5" /> {weather.today.sunrise.slice(11, 16)}
        </span>
        <span className="flex items-center gap-1">
          <Sunset className="size-3.5" /> {weather.today.sunset.slice(11, 16)}
        </span>
      </div>
      {nice && <p className="mt-2 text-[12px] font-medium text-primary">Nice out — a daylight walk boosts alertness and mood.</p>}
    </Card>
  );
}
