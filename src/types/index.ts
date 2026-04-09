/**
 * Shared TypeScript types for Pi Network Explorer App
 * Reference: SPEC-001
 */

// Search-related types
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number; // 0-1, semantic relevance
  domain: string;
  authorPseudonym: string; // SHAKE-256 hash
  createdAt: string; // ISO8601
  votes: {
    up: number;
    down: number;
  };
}

export interface SearchRequest {
  query: string;
  limit?: number; // default: 10
  offset?: number; // default: 0
  domain?: string; // optional filter
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  executionTime: number; // ms
}

// Contribution-related types
export interface ContributeFormData {
  title: string;
  content: string;
  domain: string;
  tags: string[];
}

export interface ContributionResponse {
  memoryId: string;
  status: 'accepted' | 'pending' | 'rejected';
  message: string;
  timestamp: string;
}

// Vote-related types
export interface VoteRequest {
  memoryId: string;
  vote: 1 | -1; // 1 for upvote, -1 for downvote
}

export interface VoteResponse {
  memoryId: string;
  voteCount: number;
  userVote: 1 | -1 | null;
  timestamp: string;
}

// Dashboard types
export interface DashboardStats {
  totalMemories: number;
  totalDomains: number;
  activeUsers: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'contribution' | 'vote' | 'query';
  user: string; // pseudonym
  timestamp: string;
  title?: string;
}

// Memory model (Pi Network standard)
export interface Memory {
  id: string;
  title: string;
  content: string;
  domain: string;
  tags: string[];
  authorId: string; // SHAKE-256 pseudonym
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  bayesianScore: number; // Quality score from network
  citations: string[]; // Related memory IDs
}

// Session/Auth types
export interface SessionState {
  apiKey: string | null;
  sessionId: string;
  userPseudonym?: string;
  isAuthenticated: boolean;
}

// Error handling types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// PubNub message types
export interface PubNubMessage<T = any> {
  channel: string;
  message: T;
  timetoken?: string;
  subscription?: string;
}
