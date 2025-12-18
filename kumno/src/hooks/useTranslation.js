import { useState, useCallback } from 'react';
import {
  getCachedTranslation,
  cacheTranslation,
  getMonthlyUsage,
  incrementUsage,
} from '../utils/db';

const FREE_TIER_LIMIT = 500000; // 500k characters/month

// Simple phonetic approximation for Khasi text
function generatePhonetic(khasiText) {
  const phoneticMap = {
    'kh': 'k',
    'ng': 'ng',
    'sh': 'sh',
    'th': 'th',
    'ph': 'f',
    'jing': 'jing',
    'ei': 'ay',
    'ai': 'eye',
    'oo': 'oo',
    'ia': 'ee-ah',
    'iu': 'ee-oo',
    'ie': 'ee-ay',
  };

  let phonetic = khasiText.toLowerCase();

  // Apply phonetic mappings
  Object.entries(phoneticMap).forEach(([original, replacement]) => {
    phonetic = phonetic.replace(new RegExp(original, 'g'), replacement);
  });

  // Capitalize first letter of each word
  return phonetic
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function useTranslation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monthlyUsage, setMonthlyUsage] = useState(0);

  const translate = useCallback(async (englishText) => {
    if (!englishText.trim()) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = await getCachedTranslation(englishText);
      if (cached) {
        setIsLoading(false);
        return {
          english: cached.englishOriginal,
          khasi: cached.khasi,
          phonetic: cached.phonetic,
          fromCache: true,
        };
      }

      // Check usage limit
      const currentUsage = await getMonthlyUsage();
      const textLength = englishText.length;

      if (currentUsage + textLength > FREE_TIER_LIMIT) {
        throw new Error('Monthly translation limit reached. Try again next month.');
      }

      // Call translation API
      const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: englishText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();

      // Generate phonetic guide
      const phonetic = generatePhonetic(data.translatedText);

      // Cache the translation
      await cacheTranslation(englishText, data.translatedText, phonetic);

      // Update usage
      const newUsage = await incrementUsage(textLength);
      setMonthlyUsage(newUsage);

      return {
        english: englishText,
        khasi: data.translatedText,
        phonetic,
        fromCache: false,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkUsage = useCallback(async () => {
    const usage = await getMonthlyUsage();
    setMonthlyUsage(usage);
    return usage;
  }, []);

  return {
    translate,
    isLoading,
    error,
    monthlyUsage,
    usageLimit: FREE_TIER_LIMIT,
    checkUsage,
  };
}
