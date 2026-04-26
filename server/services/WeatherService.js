import axios from 'axios';

export class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || 'demo';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getWeather(latitude, longitude) {
    const cacheKey = `${latitude},${longitude}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Try Open-Meteo (free, no API key needed)
      const weather = await this.fetchFromOpenMeteo(latitude, longitude);
      this.cache.set(cacheKey, { data: weather, timestamp: Date.now() });
      return weather;
    } catch (error) {
      console.error('Weather fetch error:', error.message);
      return this.getMockWeather(latitude, longitude);
    }
  }

  async fetchFromOpenMeteo(latitude, longitude) {
    const url = 'https://api.open-meteo.com/v1/forecast';
    const params = {
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      timezone: 'auto'
    };

    const response = await axios.get(url, { params });
    return this.parseOpenMeteoResponse(response.data, latitude, longitude);
  }

  parseOpenMeteoResponse(data, latitude, longitude) {
    const current = data.current;
    const timezone = data.timezone;

    return {
      temp: Math.round(current.temperature_2m * 10) / 10,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      condition: this.mapWeatherCode(current.weather_code),
      pressure: 1013,
      visibility: 10,
      feelsLike: Math.round(current.apparent_temperature * 10) / 10,
      uvIndex: Math.round(current.uv_index),
      fetchedAt: new Date().toISOString(),
      timezone,
      coordinates: { latitude, longitude }
    };
  }

  mapWeatherCode(code) {
    const mapping = {
      0: 'clear',
      1: 'clear',
      2: 'cloudy',
      3: 'cloudy',
      45: 'cloudy',
      48: 'cloudy',
      51: 'rainy',
      53: 'rainy',
      55: 'rainy',
      61: 'rainy',
      63: 'rainy',
      65: 'rainy',
      71: 'snowy',
      73: 'snowy',
      75: 'snowy',
      77: 'snowy',
      80: 'rainy',
      81: 'rainy',
      82: 'rainy',
      85: 'snowy',
      86: 'snowy',
      95: 'stormy',
      96: 'stormy',
      99: 'stormy'
    };

    return mapping[code] || 'cloudy';
  }

  getMockWeather(latitude, longitude) {
    const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'clear'];
    const randomIndex = Math.floor((latitude + longitude) * 100) % conditions.length;

    return {
      temp: 15 + (Math.sin(latitude) * 15),
      humidity: 50 + (Math.cos(longitude) * 30),
      windSpeed: 10 + (Math.sin(latitude + longitude) * 10),
      condition: conditions[randomIndex],
      pressure: 1013,
      visibility: 10,
      feelsLike: 14 + (Math.sin(latitude) * 15),
      uvIndex: 5,
      fetchedAt: new Date().toISOString(),
      timezone: 'UTC',
      coordinates: { latitude, longitude }
    };
  }

  validateLocation(latitude, longitude) {
    return (
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  calculateWeatherDiversity(locations) {
    const conditions = locations.map(loc =>
      this.getMockWeather(loc.latitude, loc.longitude).condition
    );

    return {
      uniqueConditions: [...new Set(conditions)].length,
      totalLocations: locations.length,
      diversity: [...new Set(conditions)].length / locations.length
    };
  }
}
