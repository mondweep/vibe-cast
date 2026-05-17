export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          total_words: number;
          current_streak: number;
          last_active_date: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          total_words?: number;
          current_streak?: number;
          last_active_date?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          total_words?: number;
          current_streak?: number;
          last_active_date?: string | null;
        };
      };
      words: {
        Row: {
          id: string;
          devanagari: string;
          iast: string;
          root_dhatu: string | null;
          meaning_short: string;
          meaning_full: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          devanagari: string;
          iast: string;
          root_dhatu?: string | null;
          meaning_short: string;
          meaning_full?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          devanagari?: string;
          iast?: string;
          root_dhatu?: string | null;
          meaning_short?: string;
          meaning_full?: string | null;
          category?: string | null;
          created_at?: string;
        };
      };
      user_vocabulary: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          encounter_count: number;
          first_seen_at: string;
          last_seen_at: string;
          familiarity: number;
          marked_learned: boolean;
          marked_revision: boolean;
          srs_interval: number;
          srs_ease_factor: number;
          srs_next_review: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          encounter_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          familiarity?: number;
          marked_learned?: boolean;
          marked_revision?: boolean;
          srs_interval?: number;
          srs_ease_factor?: number;
          srs_next_review?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          word_id?: string;
          encounter_count?: number;
          first_seen_at?: string;
          last_seen_at?: string;
          familiarity?: number;
          marked_learned?: boolean;
          marked_revision?: boolean;
          srs_interval?: number;
          srs_ease_factor?: number;
          srs_next_review?: string;
        };
      };
      word_encounters: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          song_id: string;
          line_number: number;
          encountered_at: string;
          looked_up: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          song_id: string;
          line_number: number;
          encountered_at?: string;
          looked_up?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          word_id?: string;
          song_id?: string;
          line_number?: number;
          encountered_at?: string;
          looked_up?: boolean;
        };
      };
      songs: {
        Row: {
          id: string;
          youtube_url: string;
          title: string | null;
          lyrics_json: LyricsLine[] | null;
          cached_at: string;
        };
        Insert: {
          id?: string;
          youtube_url: string;
          title?: string | null;
          lyrics_json?: LyricsLine[] | null;
          cached_at?: string;
        };
        Update: {
          id?: string;
          youtube_url?: string;
          title?: string | null;
          lyrics_json?: LyricsLine[] | null;
          cached_at?: string;
        };
      };
      revision_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          mode: RevisionMode;
          words_reviewed: number;
          words_correct: number;
          words_incorrect: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          mode: RevisionMode;
          words_reviewed?: number;
          words_correct?: number;
          words_incorrect?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          mode?: RevisionMode;
          words_reviewed?: number;
          words_correct?: number;
          words_incorrect?: number;
        };
      };
    };
  };
}

export type TranscriptConfidence = 'high' | 'medium' | 'low';

export interface LyricsLine {
  line: number;
  start_time: number;
  end_time: number;
  devanagari: string;
  iast: string;
  english_literal: string;
  english_poetic: string;
  explanation: string;
  words: WordBreakdown[];
  /**
   * How confident we are that this line is genuine Sanskrit content vs.
   * Whisper transcription noise. 'high' = Devanagari or Claude-confident;
   * 'medium' = plausibly Sanskrit but borderline; 'low' = suspicious but
   * not obviously garbage, shown with a warning. Defaults to 'high' for
   * older rows that pre-date the confidence pipeline.
   */
  confidence?: TranscriptConfidence;
  /** Short human-readable reason the line landed in its tier (debug aid). */
  confidence_reason?: string;
  /**
   * If true, this line was deliberately not translated because its
   * confidence was 'low'. The UI shows a "Translate anyway?" affordance
   * to let the user opt into translating it on demand.
   */
  translation_pending?: boolean;
}

export interface WordBreakdown {
  devanagari: string;
  iast: string;
  meaning: string;
  root_dhatu?: string;
  grammar?: string;
}

export type RevisionMode = 'flashcard' | 'audio' | 'matching' | 'sentence';

export type FamiliarityLevel = 'new' | 'recognized' | 'known' | 'mastered';

export type TranslationMode = 'literal' | 'poetic';
