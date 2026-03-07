export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          duration_ms: number | null;
          tuning: string;
          chord_count: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          duration_ms?: number | null;
          tuning?: string;
          chord_count?: number;
        };
        Update: {
          ended_at?: string | null;
          duration_ms?: number | null;
          chord_count?: number;
        };
        Relationships: [];
      };
      session_chords: {
        Row: {
          id: string;
          session_id: string;
          chord_name: string;
          root: string;
          quality: string;
          timestamp_ms: number;
          duration_ms: number;
          source: string;
          confidence: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          chord_name: string;
          root: string;
          quality: string;
          timestamp_ms: number;
          duration_ms: number;
          source?: string;
          confidence?: number | null;
        };
        Update: {
          duration_ms?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
