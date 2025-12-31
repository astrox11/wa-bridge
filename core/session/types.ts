import type { CacheStore, WASocket } from "baileys";

export interface ActiveSession {
  id: string;
  phoneNumber: string;
  socket: WASocket | null;
  msgRetryCounterCache: CacheStore;
  status: "connecting" | "connected" | "disconnected" | "pairing" | "paused_user" | "paused_network";
  pushNameInterval?: ReturnType<typeof setInterval>;
}

/**
 * Network monitoring state
 */
export interface NetworkState {
  isHealthy: boolean;
  consecutiveFailures: number;
  lastCheck: number;
  isPaused: boolean;
}
