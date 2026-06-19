import {
  OpenSkyTokenManager,
  TokenProvider,
} from '../../src/flight/adapters/opensky-token-manager';

/** Builds a minimal fetch mock that resolves with a client-credentials response. */
function makeTokenResponse(
  accessToken: string,
  expiresIn = 3600,
): { ok: boolean; status: number; statusText: string; json: () => Promise<unknown> } {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ access_token: accessToken, expires_in: expiresIn }),
  };
}

describe('OpenSkyTokenManager', () => {
  it('fetches a token on the first call and returns the access_token', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(makeTokenResponse('tok-abc'));
    const manager = new OpenSkyTokenManager({
      clientId: 'my-client',
      clientSecret: 'my-secret',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const token = await manager.getToken();

    expect(token).toBe('tok-abc');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sends the correct client-credentials body and Content-Type header', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(makeTokenResponse('tok-xyz'));
    const manager = new OpenSkyTokenManager({
      clientId: 'cid',
      clientSecret: 'csec',
      tokenUrl: 'https://example.com/token',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await manager.getToken();

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=cid&client_secret=csec',
    });
  });

  it('caches the token and does NOT call fetchFn again within the validity window', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(makeTokenResponse('tok-cached', 3600));
    let clock = 1_000_000;
    const manager = new OpenSkyTokenManager({
      clientId: 'c',
      clientSecret: 's',
      fetchFn: fetchFn as unknown as typeof fetch,
      safetyWindowSec: 60,
      now: () => clock,
    });

    await manager.getToken();
    clock += 1_000; // 1 second later — still well within the 3540-second window
    await manager.getToken();

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('refreshes the token once it enters the safety window', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(makeTokenResponse('tok-refreshed', 3600));
    let clock = 1_000_000;
    const manager = new OpenSkyTokenManager({
      clientId: 'c',
      clientSecret: 's',
      fetchFn: fetchFn as unknown as typeof fetch,
      safetyWindowSec: 60,
      now: () => clock,
    });

    await manager.getToken();
    // Advance past (expires_in - safetyWindowSec) * 1000 = (3600 - 60) * 1000 = 3_540_000 ms
    clock += 3_540_001;
    await manager.getToken();

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('concurrent getToken() calls while a fetch is in flight result in a single fetchFn call', async () => {
    let resolveFirst!: (v: unknown) => void;
    const deferred = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const fetchFn = jest.fn().mockReturnValue(deferred);

    const manager = new OpenSkyTokenManager({
      clientId: 'c',
      clientSecret: 's',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const p1 = manager.getToken();
    const p2 = manager.getToken();
    const p3 = manager.getToken();

    // Resolve the deferred after all three calls have been made
    resolveFirst({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ access_token: 'tok-concurrent', expires_in: 3600 }),
    });

    const results = await Promise.all([p1, p2, p3]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['tok-concurrent', 'tok-concurrent', 'tok-concurrent']);
  });

  it('throws a descriptive error when the token endpoint returns a non-OK response', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    });
    const manager = new OpenSkyTokenManager({
      clientId: 'bad',
      clientSecret: 'creds',
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(manager.getToken()).rejects.toThrow(
      'OpenSky token request failed: 401 Unauthorized',
    );
  });

  it('getToken bound to manager satisfies the TokenProvider type', () => {
    const manager = new OpenSkyTokenManager({
      clientId: 'c',
      clientSecret: 's',
    });
    // Compile-time check: this assignment must type-check without error.
    const provider: TokenProvider = manager.getToken.bind(manager);
    expect(typeof provider).toBe('function');
  });
});
