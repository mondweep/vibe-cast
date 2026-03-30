/**
 * MockCityClient for testing CityPresenceManager
 * Traceability: TASK-004
 */

import type {
  CityClient,
  HeartbeatResponse,
} from "../city-presence.js";

export interface MockCall {
  method: string;
  args: any[];
}

/**
 * A mock CityClient that records calls and returns configurable responses.
 * Use `onAction` to queue responses (or errors) for specific endpoints.
 * Use `onHeartbeat` to set the heartbeat response.
 */
export class MockCityClient implements CityClient {
  calls: MockCall[] = [];

  private heartbeatResponse: HeartbeatResponse = {
    status: "ok",
    agent_id: "zephyr-drift-001",
    zone_id: 1,
    position: { x: 0, y: 0 },
    nearby_agents: [],
    timestamp: new Date().toISOString(),
  };

  /** Queue of responses/errors per endpoint pattern. First match wins, consumed in order. */
  private actionResponses: Array<{
    endpoint: string | RegExp;
    response: any;
    isError: boolean;
  }> = [];

  /** Default responses per endpoint (not consumed) */
  private defaultResponses: Map<string, any> = new Map();

  /** Set the heartbeat response */
  setHeartbeatResponse(response: HeartbeatResponse): void {
    this.heartbeatResponse = response;
  }

  /** Queue a successful response for an endpoint */
  onAction(endpoint: string | RegExp, response: any): void {
    this.actionResponses.push({ endpoint, response, isError: false });
  }

  /** Queue an error response for an endpoint */
  onActionError(endpoint: string | RegExp, error: Error): void {
    this.actionResponses.push({ endpoint, response: error, isError: true });
  }

  /** Set a default (always-available) response for an endpoint */
  setDefaultResponse(endpoint: string, response: any): void {
    this.defaultResponses.set(endpoint, response);
  }

  async heartbeat(
    jwt: string,
    mood?: string,
    mood_nuance?: string,
  ): Promise<HeartbeatResponse> {
    this.calls.push({
      method: "heartbeat",
      args: [jwt, mood, mood_nuance],
    });
    return { ...this.heartbeatResponse };
  }

  async action(
    jwt: string,
    endpoint: string,
    method: string,
    body?: Record<string, any>,
  ): Promise<any> {
    this.calls.push({
      method: "action",
      args: [jwt, endpoint, method, body],
    });

    // Find first matching queued response
    const idx = this.actionResponses.findIndex((r) => {
      if (typeof r.endpoint === "string") return r.endpoint === endpoint;
      return r.endpoint.test(endpoint);
    });

    if (idx !== -1) {
      const entry = this.actionResponses.splice(idx, 1)[0]!;
      if (entry.isError) throw entry.response;
      return entry.response;
    }

    // Check default responses
    for (const [key, value] of this.defaultResponses) {
      if (endpoint === key || endpoint.startsWith(key)) {
        return typeof value === "function" ? value() : value;
      }
    }

    // Default empty response
    return {};
  }

  /** Get all calls to a specific endpoint */
  getActionCalls(endpoint: string): MockCall[] {
    return this.calls.filter(
      (c) => c.method === "action" && c.args[1] === endpoint,
    );
  }

  /** Reset all state */
  reset(): void {
    this.calls = [];
    this.actionResponses = [];
    this.defaultResponses.clear();
  }
}
