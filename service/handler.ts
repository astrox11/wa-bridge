/**
 * Service layer request handlers
 * Consistent with middleware/handler.ts pattern
 */

import { log } from "../core";
import type { ApiResponse, WsRequest, WsResponse, WsAction } from "./types";
import { WsResponseErrors, ApiResponseErrors } from "./errors";
import {
  validateWsRequest,
  validateActionParams,
  parseWsRequest,
} from "./predicates";
import {
  getSessions,
  getSession,
  createSession,
  deleteSession,
  pauseSession,
  resumeSession,
  getAuthStatus,
  getOverallStats,
  getSessionStats,
  getMessages,
  getConfig,
  getNetworkState,
  getGroups,
} from "./middleware";

/**
 * Parse JSON body from request safely
 */
export async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Create a success WebSocket response
 */
export function createWsResponse(
  action: WsAction,
  requestId: string | undefined,
  data: unknown,
): WsResponse {
  return {
    action,
    requestId,
    success: true,
    data,
  };
}

/**
 * Create an error WebSocket response
 */
export function createWsErrorResponse(
  action: WsAction,
  requestId: string | undefined,
  error: string,
): WsResponse {
  return {
    action,
    requestId,
    success: false,
    error,
  };
}

/**
 * Action handler map for WebSocket actions
 */
type ActionHandler = (
  params: Record<string, unknown>,
) => ApiResponse | Promise<ApiResponse>;

const actionHandlers: Record<WsAction, ActionHandler> = {
  getSessions: () => getSessions(),

  getSession: (params) => getSession(params.id as string),

  createSession: (params) => createSession(params.phoneNumber as string),

  deleteSession: (params) => deleteSession(params.id as string),

  getAuthStatus: (params) => getAuthStatus(params.sessionId as string),

  getStats: () => getOverallStats(),

  getSessionStats: (params) => getSessionStats(params.sessionId as string),

  getMessages: (params) =>
    getMessages(
      params.sessionId as string,
      (params.limit as number) || 100,
      (params.offset as number) || 0,
    ),

  getConfig: () => getConfig(),

  getNetworkState: () => getNetworkState(),

  getGroups: (params) => getGroups(params.sessionId as string),

  pauseSession: (params) => pauseSession(params.id as string),

  resumeSession: (params) => resumeSession(params.id as string),
};

/**
 * Handle WebSocket action request
 * Main entry point for WebSocket message handling
 */
export async function handleWsAction(request: WsRequest): Promise<WsResponse> {
  const { action, requestId, params = {} } = request;

  log.debug("WebSocket action received:", action, params);

  // Validate action params
  const paramsError = validateActionParams(action, params);
  if (paramsError) {
    return createWsErrorResponse(action, requestId, paramsError);
  }

  try {
    const handler = actionHandlers[action];
    if (!handler) {
      return createWsErrorResponse(
        action,
        requestId,
        WsResponseErrors.UNKNOWN_ACTION,
      );
    }

    const result = await handler(params);
    return {
      action,
      requestId,
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    log.error(`WebSocket action error on ${action}:`, error);
    return createWsErrorResponse(
      action,
      requestId,
      error instanceof Error ? error.message : WsResponseErrors.ACTION_FAILED,
    );
  }
}

/**
 * Parse and handle raw WebSocket message
 * Validates message format before processing
 */
export async function handleRawWsMessage(data: unknown): Promise<WsResponse> {
  const request = parseWsRequest(data);

  if (!request) {
    return {
      action: "getSessions" as WsAction, // default action for error response
      success: false,
      error: WsResponseErrors.INVALID_REQUEST,
    };
  }

  return handleWsAction(request);
}

/**
 * Route matching result
 */
interface RouteMatch {
  handler: (
    req: Request,
    params?: Record<string, string>,
  ) => Promise<ApiResponse>;
  params: Record<string, string>;
}

/**
 * Match a route pattern against a path
 */
export function matchRoute(
  method: string,
  path: string,
  routes: Record<
    string,
    (req: Request, params?: Record<string, string>) => Promise<ApiResponse>
  >,
): RouteMatch | null {
  const routeKey = `${method} ${path}`;

  // Exact match
  if (routes[routeKey]) {
    return { handler: routes[routeKey], params: {} };
  }

  // Pattern matching
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

/**
 * Create an API error response
 */
export function createApiError(error: string): ApiResponse {
  return { success: false, error };
}

/**
 * Create an API success response
 */
export function createApiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
