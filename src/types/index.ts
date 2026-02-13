// ============================================
// VIRTUOSO TYPE DEFINITIONS
// Mirrors the Supabase database schema
// ============================================

// ============================================
// BASE TYPES
// ============================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format

// ============================================
// DATABASE ROW TYPES (Direct schema mapping)
// ============================================

export interface Profile {
  id: UUID;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  primary_instrument: string | null;
  account_type: 'public' | 'private';
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BreakEvent {
  start: number; // seconds from session start
  end: number;   // seconds from session start
}

export interface Session {
  id: UUID;
  user_id: UUID;
  instrument: string;
  duration_seconds: number;
  break_seconds: number;
  break_timeline: BreakEvent[];
  piece_name: string | null;
  skills_practiced: string | null;
  description: string | null;
  focus: "clear_goals" | "mid" | "noodling" | null;
  entropy: "few_measures" | "in_between" | "whole_piece" | null;
  enjoyment: "progress" | "ok" | "stuck" | null;
  audio_url: string | null;
  is_manual_entry: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Follow {
  follower_id: UUID;
  following_id: UUID;
  status: 'pending' | 'accepted';
  created_at: Timestamp;
}

export interface Kudo {
  id: UUID;
  user_id: UUID;
  session_id: UUID;
  created_at: Timestamp;
}

export interface Comment {
  id: UUID;
  user_id: UUID;
  session_id: UUID;
  content: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Snippet {
  id: UUID;
  session_id: UUID;
  user_id: UUID;
  audio_url: string;
  start_time_ms: number;
  duration_ms: number;
  created_at: Timestamp;
}

// ============================================
// VIEW TYPES (Computed)
// ============================================

export interface UserStats {
  user_id: UUID;
  total_sessions: number;
  total_seconds: number;
  practice_days: number;
  last_practice_at: Timestamp | null;
}

export interface SessionWithCounts extends Session {
  kudos_count: number;
  comments_count: number;
}

// ============================================
// JOINED/ENRICHED TYPES (For UI)
// ============================================

/** Session card in the feed - includes author info and engagement */
export interface FeedSession extends SessionWithCounts {
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  has_kudoed: boolean; // Whether current user has given kudos
  snippets?: Pick<Snippet, 'id' | 'start_time_ms' | 'duration_ms' | 'audio_url'>[]; // Audio snippets
}

/** Comment with author info for display */
export interface CommentWithAuthor extends Comment {
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
}

/** Profile with stats for profile page */
export interface ProfileWithStats extends Profile {
  stats: UserStats;
  followers_count: number;
  following_count: number;
  is_following: boolean; // Whether current user is following (accepted)
  follow_status: 'none' | 'pending' | 'accepted' | 'requested'; // 'requested' means they requested to follow you
}

// ============================================
// INSERT TYPES (For creating new records)
// ============================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export type SessionInsert = Omit<Session, 'id' | 'created_at' | 'updated_at' | 'audio_url'> & { audio_url?: string | null };
export type SessionUpdate = Partial<Omit<Session, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type CommentInsert = Omit<Comment, 'id' | 'created_at' | 'updated_at'>;
export type CommentUpdate = Pick<Comment, 'content'>;

export type FollowInsert = Omit<Follow, 'created_at'>;
export type KudoInsert = Omit<Kudo, 'id' | 'created_at'>;

// ============================================
// FORM/INPUT TYPES (For UI forms)
// ============================================

/** Timer/Logger form input */
export interface SessionFormInput {
  instrument: string;
  duration_seconds: number;
  piece_name?: string;
  description?: string;
  audio_file?: File;
}

/** Profile edit form input */
export interface ProfileFormInput {
  username: string;
  display_name?: string;
  bio?: string;
  primary_instrument?: string;
  avatar_file?: File;
}

/** Comment form input */
export interface CommentFormInput {
  content: string;
}

// ============================================
// ENUMS & CONSTANTS
// ============================================

/** Common instruments for selection */
export const INSTRUMENTS = [
  'Piano',
  'Guitar',
  'Violin',
  'Cello',
  'Drums',
  'Bass',
  'Saxophone',
  'Trumpet',
  'Flute',
  'Clarinet',
  'Voice',
  'Ukulele',
  'Synthesizer',
  'Other',
] as const;

export type Instrument = (typeof INSTRUMENTS)[number];

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============================================
// SUPABASE DATABASE TYPE (for client typing)
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      sessions: {
        Row: Session;
        Insert: SessionInsert;
        Update: SessionUpdate;
      };
      follows: {
        Row: Follow;
        Insert: FollowInsert;
        Update: never;
      };
      kudos: {
        Row: Kudo;
        Insert: KudoInsert;
        Update: never;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
    };
    Views: {
      user_stats: {
        Row: UserStats;
      };
      sessions_with_counts: {
        Row: SessionWithCounts;
      };
    };
  };
}
