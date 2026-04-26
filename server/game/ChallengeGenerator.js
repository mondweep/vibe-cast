import { v4 as uuidv4 } from 'uuid';

export class ChallengeGenerator {
  constructor() {
    this.challengeTypes = [
      'TemperatureMatch',
      'HumidityPrediction',
      'WindChallenge',
      'WeatherQuiz',
      'LocationTrivia',
      'ConditionRace',
      'StormTracker'
    ];
  }

  generateChallenges(count, difficulty, playerWeathers) {
    const challenges = [];
    const typeCount = Math.ceil(count / this.challengeTypes.length);

    for (let i = 0; i < count; i++) {
      const typeIndex = i % this.challengeTypes.length;
      const type = this.challengeTypes[typeIndex];

      challenges.push(
        this.createChallenge(type, difficulty, playerWeathers)
      );
    }

    return challenges;
  }

  createChallenge(type, difficulty, playerWeathers) {
    const baseDurations = {
      'easy': 30,
      'medium': 60,
      'hard': 120,
      'extreme': 180
    };

    const challenge = {
      id: uuidv4(),
      type,
      difficulty,
      duration: baseDurations[difficulty] || 60,
      weatherFilters: this.getWeatherFilters(playerWeathers),
      maxPlayers: 100,
      scoringRules: this.getScoringRules(type),
      status: 'pending',
      content: this.generateContent(type, playerWeathers),
      correctAnswer: this.generateCorrectAnswer(type, playerWeathers)
    };

    return challenge;
  }

  generateContent(type, playerWeathers) {
    const contents = {
      'TemperatureMatch': {
        question: `Which location has the highest temperature right now?`,
        type: 'multiple-choice'
      },
      'HumidityPrediction': {
        question: `Estimate the average humidity across all player locations (%)`,
        type: 'number',
        min: 0,
        max: 100
      },
      'WindChallenge': {
        question: `Identify all locations with wind speed > 20 km/h`,
        type: 'multiple-select'
      },
      'WeatherQuiz': {
        question: `Which weather condition has the most players?`,
        type: 'multiple-choice'
      },
      'LocationTrivia': {
        question: `Name the player from the hottest location`,
        type: 'free-text'
      },
      'ConditionRace': {
        question: `First to type the most common weather condition wins!`,
        type: 'speed-challenge'
      },
      'StormTracker': {
        question: `How many players are experiencing stormy or severe weather?`,
        type: 'number',
        min: 0,
        max: 100
      }
    };

    return contents[type] || contents['WeatherQuiz'];
  }

  generateCorrectAnswer(type, playerWeathers) {
    if (playerWeathers.length === 0) return null;

    const temps = playerWeathers.map(w => w.temp);
    const humidities = playerWeathers.map(w => w.humidity);
    const conditions = playerWeathers.map(w => w.condition);

    const answers = {
      'TemperatureMatch': Math.max(...temps),
      'HumidityPrediction': Math.round(humidities.reduce((a, b) => a + b) / humidities.length),
      'WindChallenge': playerWeathers.filter(w => w.windSpeed > 20).length,
      'WeatherQuiz': this.getMostCommon(conditions),
      'LocationTrivia': 'Varies',
      'ConditionRace': this.getMostCommon(conditions),
      'StormTracker': playerWeathers.filter(w =>
        w.condition === 'stormy' || w.condition === 'rainy'
      ).length
    };

    return answers;
  }

  getScoringRules(type) {
    const rules = {
      'TemperatureMatch': { perfectMatch: 100, tolerance: 0 },
      'HumidityPrediction': { perfectMatch: 100, tolerance: 5 },
      'WindChallenge': { perfectMatch: 100, tolerance: 1 },
      'WeatherQuiz': { perfectMatch: 100, tolerance: 0 },
      'LocationTrivia': { perfectMatch: 50, tolerance: 0 },
      'ConditionRace': { baseScore: 100, speedBonus: 50 },
      'StormTracker': { perfectMatch: 100, tolerance: 1 }
    };

    return rules[type] || { perfectMatch: 100 };
  }

  getWeatherFilters(playerWeathers) {
    const conditions = [...new Set(playerWeathers.map(w => w.condition))];
    return conditions;
  }

  getMostCommon(array) {
    const frequency = {};
    let maxCount = 0;
    let mostCommon = array[0];

    for (const item of array) {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxCount) {
        maxCount = frequency[item];
        mostCommon = item;
      }
    }

    return mostCommon;
  }
}
