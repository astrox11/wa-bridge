/**
 * Service layer type definitions
 * Consistent with middleware/types.ts pattern
 */

// Re-export shared types from middleware
export type {
  ApiResponse,
  SessionData,
  SessionCreateResult,
  AuthStatusData,
  SessionStatsData,
  OverallStatsData,
  MessagesData,
  ConfigData,
  GroupData,
  GroupsData,
} from "./middleware";

/** Session creation request parameters */
export interface SessionCreateRequest {
  phoneNumber: string;
  botName?: string;
}

/** WebSocket action types for bidirectional communication */
export type WsAction =
  | "getSessions"
  | "getSession"
  | "createSession"
  | "deleteSession"
  | "getAuthStatus"
  | "getStats"
  | "getSessionStats"
  | "getMessages"
  | "getConfig"
  | "getNetworkState"
  | "getGroups"
  | "pauseSession"
  | "resumeSession";

/** WebSocket request structure */
export interface WsRequest {
  action: WsAction;
  requestId?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

/** WebSocket response structure */
export interface WsResponse {
  action: WsAction;
  requestId?: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/** Known WebSocket response types for type-safe handling */
export interface WsResponsePayloads {
  getSessions: import("./middleware").SessionData[];
  getSession: import("./middleware").SessionData;
  createSession: import("./middleware").SessionCreateResult;
  deleteSession: MessageResult;
  getAuthStatus: import("./middleware").AuthStatusData;
  getStats: import("./middleware").OverallStatsData;
  getSessionStats: import("./middleware").SessionStatsData;
  getMessages: import("./middleware").MessagesData;
  getConfig: import("./middleware").ConfigData;
  getNetworkState: NetworkStateData;
  getGroups: import("./middleware").GroupsData;
  pauseSession: MessageResult;
  resumeSession: MessageResult;
}

/** Generic message result for operations */
export interface MessageResult {
  message: string;
}

/** Network health state */
export interface NetworkStateData {
  isHealthy: boolean;
  consecutiveFailures: number;
  lastCheck: number;
  isPaused: boolean;
}

/** Stats update push from server */
export interface StatsUpdate {
  type: "stats";
  data: {
    overall: import("./middleware").OverallStatsData;
    sessions: Array<
      import("./middleware").SessionData & {
        stats: import("./middleware").SessionStatsData;
      }
    >;
    network: NetworkStateData;
  };
}

/** Route handler function type */
export type RouteHandler = (
  req: Request,
  params?: Record<string, string>,
) => Promise<import("./middleware").ApiResponse>;
