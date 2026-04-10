const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes
let cachedData: { data: WeatherData; timestamp: number } | null = null

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

function mapIcon(iconCode: string): string {
  const map: Record<string, string> = {
    "01d": "sun",
    "01n": "moon",
    "02d": "cloud-sun",
    "02n": "cloud-moon",
    "03d": "cloud",
    "03n": "cloud",
    "04d": "clouds",
    "04n": "clouds",
    "09d": "cloud-drizzle",
    "09n": "cloud-drizzle",
    "10d": "cloud-rain",
    "10n": "cloud-rain",
    "11d": "cloud-lightning",
    "11n": "cloud-lightning",
    "13d": "snowflake",
    "13n": "snowflake",
    "50d": "haze",
    "50n": "haze",
  }
  return map[iconCode] || "cloud"
}

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  const lat = process.env.WEATHER_LAT
  const lng = process.env.WEATHER_LNG

  if (!apiKey || !lat || !lng) {
    return Response.json(
      { error: "Weather not configured. Add OPENWEATHERMAP_API_KEY, WEATHER_LAT, and WEATHER_LNG to .env.local" },
      { status: 503 }
    )
  }

  // Return cached data if fresh
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return Response.json(cachedData.data)
  }

  try {
    // Current weather
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`
    )
    if (!currentRes.ok) throw new Error("Weather API failed")
    const current = await currentRes.json()

    // 5-day forecast
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`
    )
    if (!forecastRes.ok) throw new Error("Forecast API failed")
    const forecastData = await forecastRes.json()

    // Group forecast by day, take next 3 days
    const dailyMap = new Map<string, { temps: number[]; icon: string }>()
    for (const item of forecastData.list) {
      const day = new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" })
      const today = new Date().toLocaleDateString("en-US", { weekday: "short" })
      if (day === today) continue

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { temps: [], icon: item.weather[0].icon })
      }
      dailyMap.get(day)!.temps.push(item.main.temp)
    }

    const forecast = Array.from(dailyMap.entries())
      .slice(0, 3)
      .map(([day, data]) => ({
        day,
        high: Math.round(Math.max(...data.temps)),
        low: Math.round(Math.min(...data.temps)),
        icon: mapIcon(data.icon),
      }))

    const weatherData: WeatherData = {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      description: current.weather[0].description,
      icon: mapIcon(current.weather[0].icon),
      humidity: current.main.humidity,
      windSpeed: Math.round(current.wind.speed),
      city: current.name,
      forecast,
    }

    cachedData = { data: weatherData, timestamp: Date.now() }
    return Response.json(weatherData)
  } catch {
    return Response.json({ error: "Failed to fetch weather" }, { status: 500 })
  }
}
