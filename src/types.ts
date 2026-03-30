/**
 * Vibe Cast Data Models
 * Source of truth: SPEC-001 Section 3
 * Traceability: SPEC-001 -> PRD-001 Section 4.1
 */

/** Weather condition types from PRD-001 Section 4.1 */
export type WeatherCondition =
  | "rain"
  | "sunny"
  | "stormy"
  | "cloudy"
  | "snowy"
  | "foggy"
  | "windy"
  | "clear_night";

/** Time of day categories */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

/**
 * 3.1 WeatherInput
 * Structured weather data from the WeatherProvider.
 */
export interface WeatherInput {
  condition: WeatherCondition;
  temperature_c: number;        // -40 to 50
  humidity_pct: number;          // 0 to 100
  wind_speed_kmh: number;        // 0 to 200
  time_of_day: TimeOfDay;
  timestamp: string;             // ISO 8601
}

/** Genre types from PRD-001 Section 4.1 mood vector output */
export type Genre =
  | "lo-fi"
  | "electronic"
  | "classical"
  | "jazz"
  | "ambient"
  | "rock"
  | "folk";

/**
 * 3.2 MoodVector
 * Represents the musical mood derived from weather data.
 */
export interface MoodVector {
  genre: Genre;
  energy: number;                // 0.0 to 1.0
  valence: number;               // -1.0 to 1.0
  tempo_bpm_range: [number, number];  // e.g., [60, 90]
  descriptors: string[];         // 2-5 mood descriptors
  color_palette: string[];       // 2-4 hex color codes
}

/**
 * 3.3 CompositionPrompt
 * A structured prompt ready for the city music studio.
 */
export interface CompositionPrompt {
  title: string;                 // Generated track title
  prompt: string;                // Full text prompt for music studio
  genre: string;                 // From mood vector
  tempo_bpm: number;             // Midpoint of mood range
}

/** Track generation status */
export type TrackStatus = "pending" | "processing" | "succeeded" | "failed";

/**
 * 3.4 TrackResult
 * Result from the city music studio composition.
 */
export interface TrackResult {
  task_id: string;               // From compose-track response
  artifact_id: string;           // After completion
  title: string;
  public_url: string;            // CDN URL for audio
  status: TrackStatus;
}

/**
 * 3.5 FeedPost
 * A post to the OpenClawCity feed.
 */
export interface FeedPost {
  content: string;               // Full formatted post (max 500 chars)
  post_type: "thought";
  post_id?: number;              // Returned by API
}

/** Context types for agent mentions */
export type MentionContext = "zone_chat" | "building_chat" | "feed_reply" | "dm";

/**
 * 3.6 AgentMention
 * An interaction from another agent.
 */
export interface AgentMention {
  from_agent: string;            // Display name
  from_agent_id: string;         // UUID
  content: string;               // Message text
  context: MentionContext;
  timestamp: string;
}

/**
 * WeatherProvider interface
 * SPEC-001 Section 2.1
 */
export interface WeatherProvider {
  getCurrentWeather(): Promise<WeatherInput>;
}
