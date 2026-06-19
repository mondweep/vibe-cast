/**
 * OAuth2 client-credentials token manager for the OpenSky Network.
 * Caches the bearer token and refreshes it before it expires
 * (ADR-0002). Supports injected `fetchFn` and `now` clock for testing.
 */

export interface OpenSkyTokenConfig {
  clientId: string;
  clientSecret: string;
  /** Defaults to the OpenSky Keycloak token endpoint. */
  tokenUrl?: string;
  /**
   * How many seconds before the token actually expires to treat it as stale
   * and proactively refresh. Defaults to 60.
   */
  safetyWindowSec?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
}

/** A callable that resolves to a valid bearer token. */
export type TokenProvider = () => Promise<string>;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  obtainedAt: number;
  expiresIn: number;
}

const DEFAULT_TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

/**
 * Manages OAuth2 client-credentials tokens for the OpenSky Network API.
 * The {@link getToken} method is concurrency-safe: concurrent callers during a
 * refresh share a single in-flight request rather than each firing their own.
 */
export class OpenSkyTokenManager {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl: string;
  private readonly safetyWindowSec: number;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;

  private cached: CachedToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(config: OpenSkyTokenConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tokenUrl = config.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.safetyWindowSec = config.safetyWindowSec ?? 60;
    this.fetchFn = config.fetchFn ?? fetch;
    this.now = config.now ?? Date.now;
  }

  /** Returns a valid bearer token, refreshing from the network when needed. */
  async getToken(): Promise<string> {
    if (this.cached && !this.isStale(this.cached)) {
      return this.cached.token;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.fetchToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private isStale(cached: CachedToken): boolean {
    const expiresAt =
      cached.obtainedAt + (cached.expiresIn - this.safetyWindowSec) * 1000;
    return this.now() >= expiresAt;
  }

  private async fetchToken(): Promise<string> {
    const body =
      `grant_type=client_credentials` +
      `&client_id=${encodeURIComponent(this.clientId)}` +
      `&client_secret=${encodeURIComponent(this.clientSecret)}`;

    const res = await this.fetchFn(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      throw new Error(
        `OpenSky token request failed: ${res.status} ${res.statusText}`,
      );
    }

    const data = (await res.json()) as TokenResponse;
    this.cached = {
      token: data.access_token,
      obtainedAt: this.now(),
      expiresIn: data.expires_in,
    };
    return data.access_token;
  }
}
