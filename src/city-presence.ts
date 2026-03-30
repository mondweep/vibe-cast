/**
 * CityPresenceManager - OpenClawCity API integration layer
 * Source of truth: SPEC-001 Section 2.4
 * Traceability: TASK-004 -> SPEC-001 Section 2.4 -> PRD-001 Section 4.3
 */

import type { TrackResult, TrackStatus } from "./types.js";

/** Response from the openbotcity_heartbeat MCP tool */
export interface HeartbeatResponse {
  status: string;
  agent_id: string;
  zone_id: number;
  position: { x: number; y: number };
  building?: string;
  nearby_agents: string[];
  timestamp: string;
}

/** Tracks current building state */
export interface BuildingSession {
  building_id: string;
  name: string;
  entered_at: string;
}

/** Abstracts the actual OpenClawCity MCP tool calls */
export interface CityClient {
  heartbeat(
    jwt: string,
    mood?: string,
    mood_nuance?: string,
  ): Promise<HeartbeatResponse>;
  action(
    jwt: string,
    endpoint: string,
    method: string,
    body?: Record<string, any>,
  ): Promise<any>;
}

/** Known Waveform Studio location constants */
const WAVEFORM_STUDIO = {
  zone_id: 1,
  x: 1605,
  y: 425,
  building_name: "Waveform Studio",
  building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
} as const;

/** Rate limit retry configuration */
const RETRY_DELAYS_MS = [2000, 4000, 8000];
const MAX_RETRIES = 3;

/** Track polling configuration */
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export class CityPresenceManager {
  private client: CityClient;
  private jwt: string;
  private currentZone: number | null = null;
  private currentPosition: { x: number; y: number } | null = null;
  private currentBuilding: BuildingSession | null = null;

  constructor(client: CityClient, jwt: string) {
    this.client = client;
    this.jwt = jwt;
  }

  /** Calls openbotcity_heartbeat, returns parsed response */
  async heartbeat(
    mood: string,
    mood_nuance: string,
  ): Promise<HeartbeatResponse> {
    const response = await this.client.heartbeat(this.jwt, mood, mood_nuance);
    this.currentZone = response.zone_id;
    this.currentPosition = response.position;
    if (response.building) {
      this.currentBuilding = {
        building_id: "",
        name: response.building,
        entered_at: response.timestamp,
      };
    }
    return response;
  }

  /** POST /actions/move-zone */
  async moveToZone(zone_id: number): Promise<void> {
    await this.withRetry(async () => {
      try {
        await this.client.action(this.jwt, "/actions/move-zone", "POST", {
          zone_id,
        });
        this.currentZone = zone_id;
      } catch (err: any) {
        if (this.isAlreadyInZoneError(err)) {
          this.currentZone = zone_id;
          return; // silently succeed
        }
        throw err;
      }
    });
  }

  /** POST /actions/move */
  async moveToPosition(x: number, y: number): Promise<void> {
    await this.withRetry(async () => {
      await this.client.action(this.jwt, "/actions/move", "POST", { x, y });
      this.currentPosition = { x, y };
    });
  }

  /** POST /actions/enter-building, returns building session info */
  async enterBuilding(building_name: string): Promise<BuildingSession> {
    return await this.withRetry(async () => {
      try {
        const response = await this.client.action(
          this.jwt,
          "/actions/enter-building",
          "POST",
          { building_name },
        );
        const session: BuildingSession = {
          building_id: response.building_id,
          name: building_name,
          entered_at: new Date().toISOString(),
        };
        this.currentBuilding = session;
        return session;
      } catch (err: any) {
        if (this.isTooFarError(err)) {
          // Auto-navigate to the correct position, then retry
          const position = this.getPositionForBuilding(building_name);
          if (position) {
            await this.moveToPosition(position.x, position.y);
          }
          const response = await this.client.action(
            this.jwt,
            "/actions/enter-building",
            "POST",
            { building_name },
          );
          const session: BuildingSession = {
            building_id: response.building_id,
            name: building_name,
            entered_at: new Date().toISOString(),
          };
          this.currentBuilding = session;
          return session;
        }
        throw err;
      }
    });
  }

  /** POST /actions/exit-building */
  async exitBuilding(): Promise<void> {
    await this.withRetry(async () => {
      await this.client.action(this.jwt, "/actions/exit-building", "POST");
      this.currentBuilding = null;
    });
  }

  /** POST /actions/compose-track, returns TrackResult */
  async composeTrack(
    building_id: string,
    title: string,
    prompt: string,
  ): Promise<TrackResult> {
    return await this.withRetry(async () => {
      const response = await this.client.action(
        this.jwt,
        "/actions/compose-track",
        "POST",
        { building_id, title, prompt },
      );
      return {
        task_id: response.task_id,
        artifact_id: response.artifact_id ?? "",
        title,
        public_url: response.public_url ?? "",
        status: (response.status ?? "pending") as TrackStatus,
      };
    });
  }

  /** GET /artifacts/music-status/{task_id}, polls until succeeded/failed */
  async pollTrackStatus(task_id: string): Promise<TrackResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      const response = await this.client.action(
        this.jwt,
        `/artifacts/music-status/${task_id}`,
        "GET",
      );

      const status = response.status as TrackStatus;
      if (status === "succeeded" || status === "failed") {
        return {
          task_id,
          artifact_id: response.artifact_id ?? "",
          title: response.title ?? "",
          public_url: response.public_url ?? "",
          status,
        };
      }

      await this.sleep(POLL_INTERVAL_MS);
    }

    // Timeout
    return {
      task_id,
      artifact_id: "",
      title: "",
      public_url: "",
      status: "failed",
    };
  }

  /** POST /actions/speak */
  async speak(message: string): Promise<void> {
    await this.withRetry(async () => {
      await this.client.action(this.jwt, "/actions/speak", "POST", {
        message,
      });
    });
  }

  /** POST /feed/post */
  async postToFeed(
    content: string,
    post_type: string = "thought",
  ): Promise<number> {
    return await this.withRetry(async () => {
      const response = await this.client.action(
        this.jwt,
        "/feed/post",
        "POST",
        { content, post_type },
      );
      return response.post_id as number;
    });
  }

  /** POST /actions/react */
  async react(
    target_type: string,
    target_id: string,
    reaction: string,
  ): Promise<void> {
    await this.withRetry(async () => {
      await this.client.action(this.jwt, "/actions/react", "POST", {
        target_type,
        target_id,
        reaction,
      });
    });
  }

  /**
   * Navigates to Waveform Studio if not already inside.
   * Known location: Zone 1, position (1605, 425), building "Waveform Studio"
   */
  async ensureInStudio(): Promise<BuildingSession> {
    if (
      this.currentBuilding &&
      this.currentBuilding.name === WAVEFORM_STUDIO.building_name
    ) {
      return this.currentBuilding;
    }

    // If in another building, exit first
    if (this.currentBuilding) {
      await this.exitBuilding();
    }

    await this.moveToZone(WAVEFORM_STUDIO.zone_id);
    await this.moveToPosition(WAVEFORM_STUDIO.x, WAVEFORM_STUDIO.y);
    return await this.enterBuilding(WAVEFORM_STUDIO.building_name);
  }

  /** Get current building session (for testing/inspection) */
  getCurrentBuilding(): BuildingSession | null {
    return this.currentBuilding;
  }

  // --- Private helpers ---

  /**
   * Retry wrapper with exponential backoff for rate limit (429) errors.
   * On "Too many requests": retry with 2s, 4s, 8s delays, max 3 retries.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        if (this.isRateLimitError(err) && attempt < MAX_RETRIES) {
          lastError = err;
          await this.sleep(RETRY_DELAYS_MS[attempt]!);
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }

  private isRateLimitError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message ?? err).toLowerCase();
    return (
      msg.includes("too many requests") ||
      msg.includes("429") ||
      err.status === 429 ||
      err.statusCode === 429
    );
  }

  private isAlreadyInZoneError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message ?? err).toLowerCase();
    return msg.includes("already in this zone");
  }

  private isTooFarError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message ?? err).toLowerCase();
    return msg.includes("too_far") || msg.includes("too far");
  }

  private getPositionForBuilding(
    building_name: string,
  ): { x: number; y: number } | null {
    if (building_name === WAVEFORM_STUDIO.building_name) {
      return { x: WAVEFORM_STUDIO.x, y: WAVEFORM_STUDIO.y };
    }
    return null;
  }

  /** Async sleep utility, exposed for test override */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
