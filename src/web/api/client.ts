import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_V1_BASE, API_TIMEOUT } from '@/config/constants';
import { supabase } from '@/auth/AuthContext';

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
    // Request interceptor - attach the Supabase session JWT (primary auth that
    // the backend now verifies), plus a legacy X-API-Key if one is set.
    this.instance.interceptors.request.use(
      async (config: RequestConfig) => {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        } catch {
          // no session — request proceeds unauthenticated
        }
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

        // A 401 from the API (e.g. the legacy X-API-Key check) must NOT force a
        // navigation. Auth and routing are driven by the Supabase session via
        // ProtectedRoute / LoginPage. Forcing window.location here caused an
        // infinite redirect loop between "/" and "/login" (the dashboard's data
        // calls 401, redirect to /login, LoginPage sees a session, redirect to
        // /, repeat). Surface the error and let react-query handle it.
        if (error.response?.status === 401) {
          return Promise.reject(error);
        }

        // Retry logic for 5xx errors and network timeouts
        if (
          config &&
          !config._retry &&
          ((error.response?.status ?? 0) >= 500 || error.code === 'ECONNABORTED')
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
