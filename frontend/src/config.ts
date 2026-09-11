/**
 * Application Configuration
 * Centralizes environment-based settings for the frontend application
 */

const getBackendURL = (): string => {
  // Vite uses import.meta.env instead of process.env
  const envURL = import.meta.env.VITE_API_URL;
  if (envURL) return envURL;

  // Fallback: local backend during development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }

  // Fallback: Cloud Run backend (navier-stokes-backend, us-central1, e-vidhayak)
  return 'https://navier-stokes-backend-58061828953.us-central1.run.app';
};

export const API_BASE_URL = getBackendURL();
export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  sessions: {
    create: `${API_BASE_URL}/api/sessions`,
    get: (userId: string) => `${API_BASE_URL}/api/sessions/${userId}`,
    updateProgress: (userId: string) => `${API_BASE_URL}/api/sessions/${userId}/progress`,
  },
  health: `${API_BASE_URL}/health`,
} as const;

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

/**
 * Build-time constants
 */
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Navier-Stokes Learning Platform';
