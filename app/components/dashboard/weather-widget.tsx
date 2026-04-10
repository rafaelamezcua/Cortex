"use client"

import { Card } from "@/app/components/ui/card"
import { Skeleton } from "@/app/components/ui/skeleton"
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  Haze,
  Wind,
  Droplets,
} from "lucide-react"
import { useEffect, useState } from "react"

interface WeatherData {
  temp: number
  feelsLike: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
  city: string
  forecast: { day: string; high: number; low: number; icon: string }[]
}

const iconMap: Record<string, React.ElementType> = {
  sun: Sun,
  moon: Moon,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-lightning": CloudLightning,
  snowflake: Snowflake,
  haze: Haze,
  clouds: Cloud,
}

function WeatherIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Cloud
  return <Icon className={className} />
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(d.error))
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(typeof e === "string" ? e : "Weather unavailable"))
  }, [])

  if (error) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
            <Sun className="h-[18px] w-[18px] text-accent" />
          </div>
          <h2 className="text-sm font-medium text-foreground-secondary">Weather</h2>
        </div>
        <p className="text-xs text-foreground-tertiary">{error}</p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-20 mb-2" />
        <Skeleton className="h-4 w-32" />
      </Card>
    )
  }

  return (
    <Card className="col-span-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
          <WeatherIcon name={data.icon} className="h-[18px] w-[18px] text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground-secondary">Weather</h2>
          <p className="text-xs text-foreground-quaternary">{data.city}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Current */}
        <div className="flex items-end gap-2">
          <span className="text-4xl font-semibold tracking-tight">{data.temp}°</span>
          <WeatherIcon name={data.icon} className="mb-1 h-6 w-6 text-foreground-tertiary" />
        </div>
        <p className="text-sm capitalize text-foreground-secondary">{data.description}</p>

        {/* Details */}
        <div className="flex gap-4 text-xs text-foreground-tertiary">
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3" /> {data.humidity}%
          </span>
          <span className="flex items-center gap-1">
            <Wind className="h-3 w-3" /> {data.windSpeed} mph
          </span>
          <span>Feels {data.feelsLike}°</span>
        </div>

        {/* Forecast */}
        {data.forecast.length > 0 && (
          <div className="flex gap-3 border-t border-border-light pt-3">
            {data.forecast.map((day) => (
              <div key={day.day} className="flex-1 text-center">
                <p className="text-xs text-foreground-quaternary">{day.day}</p>
                <WeatherIcon name={day.icon} className="mx-auto my-1 h-4 w-4 text-foreground-tertiary" />
                <p className="text-xs font-medium">{day.high}°</p>
                <p className="text-xs text-foreground-quaternary">{day.low}°</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
