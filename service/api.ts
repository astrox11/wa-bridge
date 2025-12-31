/**
 * API Service Layer
 *
 * This module is a thin orchestration layer that:
 * - Aggregates and composes data from middleware calls
 * - Formats responses for consumers
 * - Exposes HTTP routes and WebSocket actions
 *
 * All business logic, validation, transformation, and error handling
 * is delegated to the middleware layer.
 */

import { log } from "./lib";
import {
  // Session operations
  getSessions as middlewareGetSessions,
  getSession as middlewareGetSession,
  createSession as middlewareCreateSession,
  deleteSession as middlewareDeleteSession,
  pauseSession as middlewarePauseSession,
  resumeSession as middlewareResumeSession,
  // Auth operations
  getAuthStatus as middlewareGetAuthStatus,
  // Stats operations
  getOverallStats as middlewareGetOverallStats,
  getSessionStats as middlewareGetSessionStats,
  // Message operations
  getMessages as middlewareGetMessages,
  // Config operations
  getConfig as middlewareGetConfig,
  // Network operations
  getNetworkState as middlewareGetNetworkState,
  // Group operations
  getGroups as middlewareGetGroups,
  // Runtime stats
  runtimeStats,
  // Types
  type ApiResponse,
} from "./middleware";

export type { ApiResponse };

// ============================================================================
// Types
// ============================================================================

interface SessionCreateRequest {
  phoneNumber: string;
  botName?: string;
}

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

export interface WsRequest {
  action: WsAction;
  requestId?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface WsResponse {
  action: WsAction;
  requestId?: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Request Parsing
// ============================================================================

async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// WebSocket Action Handler
// ============================================================================

/**
 * Handle WebSocket actions by delegating to middleware
 */
export async function handleWsAction(request: WsRequest): Promise<WsResponse> {
  const { action, requestId, params = {} } = request;

  log.debug("WebSocket action received:", action, params);

  try {
    let result: ApiResponse;

    switch (action) {
      case "getSessions":
        result = middlewareGetSessions();
        break;

      case "getSession":
        result = middlewareGetSession(params.id as string);
        break;

      case "createSession":
        result = await middlewareCreateSession(params.phoneNumber as string);
        break;

      case "deleteSession":
        result = await middlewareDeleteSession(params.id as string);
        break;

      case "getAuthStatus":
        result = middlewareGetAuthStatus(params.sessionId as string);
        break;

      case "getStats":
        result = middlewareGetOverallStats();
        break;

      case "getSessionStats":
        result = middlewareGetSessionStats(params.sessionId as string);
        break;

      case "getMessages":
        result = middlewareGetMessages(
          params.sessionId as string,
          (params.limit as number) || 100,
          (params.offset as number) || 0,
        );
        break;

      case "getConfig":
        result = middlewareGetConfig();
        break;

      case "getNetworkState":
        result = middlewareGetNetworkState();
        break;

      case "getGroups":
        result = middlewareGetGroups(params.sessionId as string);
        break;

      case "pauseSession":
        result = await middlewarePauseSession(params.id as string);
        break;

      case "resumeSession":
        result = await middlewareResumeSession(params.id as string);
        break;

      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    return {
      action,
      requestId,
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    log.error(`WebSocket action error on ${action}:`, error);
    return {
      action,
      requestId,
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

// ============================================================================
// HTTP Route Handlers
// ============================================================================

const routes: Record<
  string,
  (req: Request, params?: Record<string, string>) => Promise<ApiResponse>
> = {
  // Session management
  "GET /api/sessions": async () => {
    return middlewareGetSessions();
  },

  "POST /api/sessions": async (req) => {
    const body = await parseBody<SessionCreateRequest>(req);
    if (!body || !body.phoneNumber) {
      return { success: false, error: "Phone number is required" };
    }
    return middlewareCreateSession(body.phoneNumber);
  },

  "GET /api/sessions/:id": async (_req, params) => {
    return middlewareGetSession(params?.id);
  },

  "DELETE /api/sessions/:id": async (_req, params) => {
    return middlewareDeleteSession(params?.id as string);
  },

  // Authentication status
  "GET /api/auth/status/:sessionId": async (_req, params) => {
    return middlewareGetAuthStatus(params?.sessionId);
  },

  // Messages
  "GET /api/messages/:sessionId": async (_req, params) => {
    const url = new URL(_req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    return middlewareGetMessages(params?.sessionId as string, limit, offset);
  },

  // Statistics
  "GET /api/stats": async () => {
    return middlewareGetOverallStats();
  },

  "GET /api/stats/:sessionId": async (_req, params) => {
    return middlewareGetSessionStats(params?.sessionId as string);
  },

  // Network state
  "GET /api/network": async () => {
    return middlewareGetNetworkState();
  },

  // Config endpoint (read-only)
  "GET /api/config": async () => {
    return middlewareGetConfig();
  },
};

// ============================================================================
// Route Matching
// ============================================================================

/**
 * Match route pattern with path
 */
function matchRoute(
  method: string,
  path: string,
): {
  handler: (
    req: Request,
    params?: Record<string, string>,
  ) => Promise<ApiResponse>;
  params: Record<string, string>;
} | null {
  const routeKey = `${method} ${path}`;

  // Exact match
  if (routes[routeKey]) {
    return { handler: routes[routeKey], params: {} };
  }

  // Pattern match with parameters
  for (const [pattern, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = pattern.split(" ");
    if (routeMethod !== method) continue;

    const routeParts = routePath.split("/");
    const pathParts = path.split("/");

    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { handler, params };
    }
  }

  return null;
}

// ============================================================================
// API Request Handler
// ============================================================================

/**
 * Handle API request by matching route and delegating to middleware
 */
export async function handleApiRequest(req: Request): Promise<ApiResponse> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const route = matchRoute(method, path);
  if (!route) {
    return { success: false, error: `Route not found: ${method} ${path}` };
  }

  try {
    return await route.handler(req, route.params);
  } catch (error) {
    log.error(`API error on ${method} ${path}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

export { runtimeStats };
