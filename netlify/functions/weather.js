export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const { location } = JSON.parse(event.body)

  if (!location) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Location required' })
    }
  }

  try {
    // Using Open-Meteo API (free, no key needed)
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    )

    if (!geoResponse.ok) throw new Error('Geocoding failed')
    const geoData = await geoResponse.json()

    if (!geoData.results || geoData.results.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    const { latitude, longitude, name, country } = geoData.results[0]

    // Fetch weather
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`
    )

    if (!weatherResponse.ok) throw new Error('Weather API failed')
    const weatherData = await weatherResponse.json()

    const temp = Math.round(weatherData.current.temperature_2m)
    const code = weatherData.current.weather_code

    // Simple weather code to condition mapping
    const getCondition = (code) => {
      if (code === 0) return 'Clear sky'
      if (code === 1 || code === 2) return 'Partly cloudy'
      if (code === 3) return 'Overcast'
      if (code === 45 || code === 48) return 'Foggy'
      if (code === 51 || code === 53 || code === 55) return 'Drizzle'
      if (code === 61 || code === 63 || code === 65) return 'Rain'
      if (code === 71 || code === 73 || code === 75 || code === 77 || code === 80 || code === 81 || code === 82) return 'Snow/Sleet'
      if (code === 85 || code === 86) return 'Snow showers'
      if (code === 80 || code === 81 || code === 82) return 'Rain showers'
      if (code === 95 || code === 96 || code === 99) return 'Thunderstorm'
      return 'Unknown'
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        temp,
        condition: getCondition(code),
        location: `${name}, ${country}`,
        icon: '🌍'
      })
    }
  } catch (error) {
    console.error('Weather function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to fetch weather' })
    }
  }
}
