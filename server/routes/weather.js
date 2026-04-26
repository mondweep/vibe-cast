import express from 'express';
import { WeatherService } from '../services/WeatherService.js';

const router = express.Router();
const weatherService = new WeatherService();

// Get weather for coordinates
router.get('/current', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Latitude and longitude required'
      });
    }

    const weather = await weatherService.getWeather(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weather for multiple locations
router.post('/batch', async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations)) {
      return res.status(400).json({
        error: 'Locations array required'
      });
    }

    const weatherData = await Promise.all(
      locations.map(loc =>
        weatherService.getWeather(loc.latitude, loc.longitude)
      )
    );

    res.json({ locations: weatherData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weather statistics for session
router.post('/statistics', async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations)) {
      return res.status(400).json({
        error: 'Locations array required'
      });
    }

    const weatherData = await Promise.all(
      locations.map(loc =>
        weatherService.getWeather(loc.latitude, loc.longitude)
      )
    );

    const stats = {
      avgTemp: weatherData.reduce((a, w) => a + w.temp, 0) / weatherData.length,
      avgHumidity: weatherData.reduce((a, w) => a + w.humidity, 0) / weatherData.length,
      maxTemp: Math.max(...weatherData.map(w => w.temp)),
      minTemp: Math.min(...weatherData.map(w => w.temp)),
      conditions: [...new Set(weatherData.map(w => w.condition))],
      diversity: new Set(weatherData.map(w => w.condition)).size
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
