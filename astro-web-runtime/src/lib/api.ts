/**
 * API Client for communicating with wa-runtime backend
 */

const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Session {
  id: string;
  phone_number: string;
  created_at: number;
  status: 'active' | 'inactive' | 'pairing';
  pushName?: string;
}

interface SessionCreateResponse {
  id: string;
  pairingCode: string;
  pairingCodeFormatted: string;
}

interface AuthStatus {
  sessionId: string;
  phoneNumber: string;
  status: string;
  isAuthenticated: boolean;
  isPairing: boolean;
}

interface RuntimeStats {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  version: string;
  serverUptime: number;
  serverUptimeFormatted: string;
}

interface SessionStats {
  session: Session;
  messages: number;
  uptime: number;
  uptimeFormatted: string;
  hourlyActivity: number[];
  avgMessagesPerHour: number;
}

interface Config {
  version: string;
  defaultBotName: string;
}

interface StatsUpdate {
  type: 'stats';
  data: {
    overall: RuntimeStats;
    sessions: Array<Session & { stats: SessionStats }>;
  };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Create WebSocket connection for real-time stats
 */
function createStatsWebSocket(onMessage: (data: StatsUpdate) => void): WebSocket | null {
  if (typeof window === 'undefined') return null;
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/stats`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as StatsUpdate;
      onMessage(data);
    } catch {
      // Ignore parse errors
    }
  };
  
  ws.onerror = () => {
    console.error('WebSocket error');
  };
  
  return ws;
}

export const api = {
  // Session management
  async getSessions(): Promise<ApiResponse<Session[]>> {
    return request<Session[]>('/sessions');
  },

  async getSession(id: string): Promise<ApiResponse<Session>> {
    return request<Session>(`/sessions/${encodeURIComponent(id)}`);
  },

  async createSession(phoneNumber: string): Promise<ApiResponse<SessionCreateResponse>> {
    return request<SessionCreateResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  async deleteSession(id: string): Promise<ApiResponse<{ message: string }>> {
    return request<{ message: string }>(`/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // Authentication
  async getAuthStatus(sessionId: string): Promise<ApiResponse<AuthStatus>> {
    return request<AuthStatus>(`/auth/status/${encodeURIComponent(sessionId)}`);
  },

  // Statistics
  async getOverallStats(): Promise<ApiResponse<RuntimeStats>> {
    return request<RuntimeStats>('/stats');
  },

  async getSessionStats(sessionId: string): Promise<ApiResponse<SessionStats>> {
    return request<SessionStats>(`/stats/${encodeURIComponent(sessionId)}`);
  },

  // Config
  async getConfig(): Promise<ApiResponse<Config>> {
    return request<Config>('/config');
  },

  // WebSocket for real-time stats
  connectStats: createStatsWebSocket,
};

export type {
  Session,
  SessionCreateResponse,
  AuthStatus,
  RuntimeStats,
  SessionStats,
  Config,
  ApiResponse,
  StatsUpdate,
};
