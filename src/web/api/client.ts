import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_V1_BASE, API_TIMEOUT } from '@/config/constants';

interface RequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_V1_BASE,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - add API key if available
    this.instance.interceptors.request.use(
      (config: RequestConfig) => {
        const apiKey = localStorage.getItem('apiKey');
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - handle errors and retry
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RequestConfig;

        // Handle 401 Unauthorized - redirect to login
        if (error.response?.status === 401) {
          localStorage.removeItem('apiKey');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Retry logic for 5xx errors and network timeouts
        if (
          config &&
          !config._retry &&
          (error.response?.status >= 500 || error.code === 'ECONNABORTED')
        ) {
          config._retry = true;
          // Wait 1 second before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.instance(config);
        }

        return Promise.reject(error);
      },
    );
  }

  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient().getAxiosInstance();
export default apiClient;
