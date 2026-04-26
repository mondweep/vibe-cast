export class ScoringEngine {
  evaluateAnswer(answer, challenge, playerWeather) {
    const startTime = challenge.submittedAt || Date.now();
    const responseTime = Date.now() - startTime;
    const maxTime = challenge.duration * 1000;

    let accuracy = 0;
    let baseScore = 0;

    if (challenge.type === 'HumidityPrediction' ||
        challenge.type === 'StormTracker') {
      accuracy = this.evaluateNumberAnswer(
        answer,
        challenge.correctAnswer,
        challenge.scoringRules.tolerance
      );
      baseScore = accuracy * challenge.scoringRules.perfectMatch;
    } else if (challenge.type === 'ConditionRace') {
      accuracy = answer === challenge.correctAnswer ? 100 : 0;
      baseScore = accuracy + this.calculateSpeedBonus(responseTime, maxTime, 50);
    } else {
      accuracy = answer === challenge.correctAnswer ? 100 : 0;
      baseScore = accuracy * challenge.scoringRules.perfectMatch;
    }

    const timeBonus = this.calculateTimeBonus(responseTime, maxTime);
    const weatherBonus = this.calculateWeatherBonus(playerWeather);
    const difficultyMultiplier = this.getDifficultyMultiplier(challenge.difficulty);

    const score = Math.round(
      (baseScore + timeBonus) * difficultyMultiplier + weatherBonus
    );

    return {
      score: Math.max(0, score),
      accuracy: Math.round(accuracy),
      responseTime,
      answered: true,
      correctAnswer: challenge.correctAnswer
    };
  }

  evaluateNumberAnswer(answer, correct, tolerance) {
    const diff = Math.abs(answer - correct);
    if (diff <= tolerance) return 100;
    if (diff <= tolerance * 2) return 75;
    if (diff <= tolerance * 5) return 50;
    if (diff <= tolerance * 10) return 25;
    return 0;
  }

  calculateTimeBonus(responseTime, maxTime) {
    if (responseTime > maxTime) return 0;
    const timeRatio = responseTime / maxTime;
    return (1 - timeRatio) * 25;
  }

  calculateSpeedBonus(responseTime, maxTime, bonusPoints) {
    const speedRatio = Math.min(1, responseTime / maxTime);
    return (1 - speedRatio) * bonusPoints;
  }

  calculateWeatherBonus(weather) {
    const bonuses = {
      'sunny': 10,
      'cloudy': 15,
      'rainy': 20,
      'snowy': 30,
      'stormy': 50,
      'clear': 5
    };

    return bonuses[weather.condition] || 10;
  }

  getDifficultyMultiplier(difficulty) {
    const multipliers = {
      'easy': 0.8,
      'medium': 1.0,
      'hard': 1.5,
      'extreme': 2.0
    };

    return multipliers[difficulty] || 1.0;
  }

  calculateWeatherDiversityBonus(allPlayersWeather) {
    const conditions = [...new Set(allPlayersWeather.map(w => w.condition))];
    const maxConditions = 6;
    const diversity = conditions.length / maxConditions;
    return diversity * 50;
  }

  calculateTeamBonus(players, averageAccuracy) {
    if (averageAccuracy >= 0.8) {
      return 25;
    }
    return 0;
  }
}
