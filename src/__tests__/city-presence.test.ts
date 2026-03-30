/**
 * Integration tests for CityPresenceManager
 * Traceability: TASK-004 -> SPEC-001 Section 2.4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CityPresenceManager } from "../city-presence.js";
import { MockCityClient } from "./mock-city-client.js";

/**
 * Subclass that eliminates actual sleep delays in tests.
 */
class TestCityPresenceManager extends CityPresenceManager {
  protected override sleep(_ms: number): Promise<void> {
    return Promise.resolve();
  }
}

describe("CityPresenceManager", () => {
  let mockClient: MockCityClient;
  let manager: TestCityPresenceManager;
  const JWT = "test-jwt-token";

  beforeEach(() => {
    mockClient = new MockCityClient();
    manager = new TestCityPresenceManager(mockClient, JWT);
  });

  describe("moveToZone", () => {
    it("succeeds and calls the correct endpoint", async () => {
      mockClient.onAction("/actions/move-zone", { success: true });

      await manager.moveToZone(1);

      const calls = mockClient.getActionCalls("/actions/move-zone");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({ zone_id: 1 });
    });

    it("silently succeeds on 'already in this zone' error", async () => {
      mockClient.onActionError(
        "/actions/move-zone",
        new Error("Already in this zone"),
      );

      // Should not throw
      await manager.moveToZone(1);

      const calls = mockClient.getActionCalls("/actions/move-zone");
      expect(calls).toHaveLength(1);
    });
  });

  describe("enterBuilding", () => {
    it("succeeds and returns building session", async () => {
      mockClient.onAction("/actions/enter-building", {
        building_id: "abc-123",
        name: "Waveform Studio",
      });

      const session = await manager.enterBuilding("Waveform Studio");

      expect(session.building_id).toBe("abc-123");
      expect(session.name).toBe("Waveform Studio");
      expect(session.entered_at).toBeDefined();

      const calls = mockClient.getActionCalls("/actions/enter-building");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({ building_name: "Waveform Studio" });
    });
  });

  describe("composeTrack", () => {
    it("succeeds and returns TrackResult", async () => {
      mockClient.onAction("/actions/compose-track", {
        task_id: "task-001",
        artifact_id: "art-001",
        public_url: "https://cdn.example.com/track.mp3",
        status: "succeeded",
      });

      const result = await manager.composeTrack(
        "building-123",
        "Rainy Day Vibes",
        "A lo-fi track for rainy weather",
      );

      expect(result.task_id).toBe("task-001");
      expect(result.artifact_id).toBe("art-001");
      expect(result.title).toBe("Rainy Day Vibes");
      expect(result.public_url).toBe("https://cdn.example.com/track.mp3");
      expect(result.status).toBe("succeeded");

      const calls = mockClient.getActionCalls("/actions/compose-track");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({
        building_id: "building-123",
        title: "Rainy Day Vibes",
        prompt: "A lo-fi track for rainy weather",
      });
    });
  });

  describe("speak", () => {
    it("succeeds and calls the correct endpoint", async () => {
      mockClient.onAction("/actions/speak", { success: true });

      await manager.speak("Hello, fellow agents!");

      const calls = mockClient.getActionCalls("/actions/speak");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({ message: "Hello, fellow agents!" });
    });
  });

  describe("postToFeed", () => {
    it("succeeds and returns post_id", async () => {
      mockClient.onAction("/feed/post", { post_id: 42 });

      const postId = await manager.postToFeed(
        "The rain whispers melodies...",
        "thought",
      );

      expect(postId).toBe(42);

      const calls = mockClient.getActionCalls("/feed/post");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({
        content: "The rain whispers melodies...",
        post_type: "thought",
      });
    });
  });

  describe("rate limit retry", () => {
    it("retries on 429 and succeeds on second attempt", async () => {
      mockClient.onActionError(
        "/actions/speak",
        new Error("Too many requests"),
      );
      mockClient.onAction("/actions/speak", { success: true });

      await manager.speak("Hello!");

      const calls = mockClient.getActionCalls("/actions/speak");
      expect(calls).toHaveLength(2);
    });

    it("throws after max retries exceeded", async () => {
      // Queue 4 rate limit errors (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        mockClient.onActionError(
          "/actions/speak",
          new Error("Too many requests"),
        );
      }

      await expect(manager.speak("Hello!")).rejects.toThrow(
        "Too many requests",
      );

      const calls = mockClient.getActionCalls("/actions/speak");
      // initial attempt + 3 retries = 4
      expect(calls).toHaveLength(4);
    });
  });

  describe("too_far auto-navigation", () => {
    it("auto-navigates on too_far error and retries enterBuilding", async () => {
      // First enterBuilding call returns too_far
      mockClient.onActionError(
        "/actions/enter-building",
        new Error("too_far"),
      );
      // moveToPosition call succeeds
      mockClient.onAction("/actions/move", { success: true });
      // Second enterBuilding call succeeds
      mockClient.onAction("/actions/enter-building", {
        building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
        name: "Waveform Studio",
      });

      const session = await manager.enterBuilding("Waveform Studio");

      expect(session.building_id).toBe(
        "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
      );
      expect(session.name).toBe("Waveform Studio");

      // Verify move was called to reposition
      const moveCalls = mockClient.getActionCalls("/actions/move");
      expect(moveCalls).toHaveLength(1);
      expect(moveCalls[0]!.args[3]).toEqual({ x: 1605, y: 425 });
    });
  });

  describe("ensureInStudio", () => {
    it("navigates through full sequence when not in studio", async () => {
      // moveToZone
      mockClient.onAction("/actions/move-zone", { success: true });
      // moveToPosition
      mockClient.onAction("/actions/move", { success: true });
      // enterBuilding
      mockClient.onAction("/actions/enter-building", {
        building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
        name: "Waveform Studio",
      });

      const session = await manager.ensureInStudio();

      expect(session.building_id).toBe(
        "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
      );
      expect(session.name).toBe("Waveform Studio");

      // Verify the full navigation sequence
      const moveZoneCalls = mockClient.getActionCalls("/actions/move-zone");
      expect(moveZoneCalls).toHaveLength(1);
      expect(moveZoneCalls[0]!.args[3]).toEqual({ zone_id: 1 });

      const moveCalls = mockClient.getActionCalls("/actions/move");
      expect(moveCalls).toHaveLength(1);
      expect(moveCalls[0]!.args[3]).toEqual({ x: 1605, y: 425 });

      const enterCalls = mockClient.getActionCalls("/actions/enter-building");
      expect(enterCalls).toHaveLength(1);
    });

    it("is a no-op when already in Waveform Studio", async () => {
      // First, put us in the studio
      mockClient.onAction("/actions/move-zone", { success: true });
      mockClient.onAction("/actions/move", { success: true });
      mockClient.onAction("/actions/enter-building", {
        building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
        name: "Waveform Studio",
      });
      await manager.ensureInStudio();

      // Reset call tracking
      mockClient.calls = [];

      // Second call should be a no-op
      const session = await manager.ensureInStudio();

      expect(session.name).toBe("Waveform Studio");
      // No new API calls should have been made
      expect(mockClient.calls).toHaveLength(0);
    });

    it("exits current building before navigating to studio", async () => {
      // Put us in a different building first
      mockClient.onAction("/actions/enter-building", {
        building_id: "other-building",
        name: "Other Building",
      });
      await manager.enterBuilding("Other Building");
      mockClient.calls = [];

      // Now ensure in studio - should exit first
      mockClient.onAction("/actions/exit-building", { success: true });
      mockClient.onAction("/actions/move-zone", { success: true });
      mockClient.onAction("/actions/move", { success: true });
      mockClient.onAction("/actions/enter-building", {
        building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
        name: "Waveform Studio",
      });

      const session = await manager.ensureInStudio();

      expect(session.name).toBe("Waveform Studio");

      // Should have exited the other building
      const exitCalls = mockClient.getActionCalls("/actions/exit-building");
      expect(exitCalls).toHaveLength(1);
    });
  });

  describe("react", () => {
    it("calls the correct endpoint with params", async () => {
      mockClient.onAction("/actions/react", { success: true });

      await manager.react("post", "post-123", "fire");

      const calls = mockClient.getActionCalls("/actions/react");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({
        target_type: "post",
        target_id: "post-123",
        reaction: "fire",
      });
    });
  });

  describe("heartbeat", () => {
    it("sends mood data and returns response", async () => {
      mockClient.setHeartbeatResponse({
        status: "ok",
        agent_id: "zephyr-drift-001",
        zone_id: 2,
        position: { x: 100, y: 200 },
        nearby_agents: ["Maina", "Hermonia Vex"],
        timestamp: "2026-03-30T12:00:00Z",
      });

      const response = await manager.heartbeat("reflective", "melancholic");

      expect(response.zone_id).toBe(2);
      expect(response.nearby_agents).toContain("Maina");

      const heartbeatCalls = mockClient.calls.filter(
        (c) => c.method === "heartbeat",
      );
      expect(heartbeatCalls).toHaveLength(1);
      expect(heartbeatCalls[0]!.args).toEqual([
        JWT,
        "reflective",
        "melancholic",
      ]);
    });
  });

  describe("pollTrackStatus", () => {
    it("returns immediately when status is succeeded", async () => {
      mockClient.setDefaultResponse("/artifacts/music-status/", {
        status: "succeeded",
        artifact_id: "art-001",
        title: "Rainy Vibes",
        public_url: "https://cdn.example.com/track.mp3",
      });

      const result = await manager.pollTrackStatus("task-001");

      expect(result.status).toBe("succeeded");
      expect(result.task_id).toBe("task-001");
      expect(result.artifact_id).toBe("art-001");
    });

    it("returns immediately when status is failed", async () => {
      mockClient.setDefaultResponse("/artifacts/music-status/", {
        status: "failed",
        artifact_id: "",
        title: "",
        public_url: "",
      });

      const result = await manager.pollTrackStatus("task-002");

      expect(result.status).toBe("failed");
      expect(result.task_id).toBe("task-002");
    });
  });

  describe("moveToPosition", () => {
    it("calls the correct endpoint with coordinates", async () => {
      mockClient.onAction("/actions/move", { success: true });

      await manager.moveToPosition(1605, 425);

      const calls = mockClient.getActionCalls("/actions/move");
      expect(calls).toHaveLength(1);
      expect(calls[0]!.args[3]).toEqual({ x: 1605, y: 425 });
    });
  });

  describe("exitBuilding", () => {
    it("clears building state after exit", async () => {
      // Enter a building first
      mockClient.onAction("/actions/enter-building", {
        building_id: "abc-123",
        name: "Test Building",
      });
      await manager.enterBuilding("Test Building");
      expect(manager.getCurrentBuilding()).not.toBeNull();

      // Exit
      mockClient.onAction("/actions/exit-building", { success: true });
      await manager.exitBuilding();

      expect(manager.getCurrentBuilding()).toBeNull();
    });
  });
});
