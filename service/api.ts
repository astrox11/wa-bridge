/**
 * Service layer API routing
 * HTTP and WebSocket request handling
 */

import { log } from "../core";
import {
  getSessions,
  getSession,
  createSession,
  deleteSession,
  getAuthStatus,
  getOverallStats,
  getSessionStats,
  getMessages,
  getConfig,
  getNetworkState,
} from "./middleware";
import type { ApiResponse, SessionCreateRequest } from "./types";
import { ApiResponseErrors } from "./errors";
import {
  validatePhoneNumber,
  validatePagination,
} from "./predicates";
import {
  parseBody,
  matchRoute,
  createApiError,
} from "./handler";

// Re-export handleWsAction from handler
export { handleWsAction } from "./handler";

/**
 * API route definitions
 */
const routes: Record<
  string,
  (req: Request, params?: Record<string, string>) => Promise<ApiResponse>
> = {
  "GET /api/sessions": async () => {
    return getSessions();
  },

  "POST /api/sessions": async (req) => {
    const body = await parseBody<SessionCreateRequest>(req);
    if (!body) {
      return createApiError(ApiResponseErrors.INVALID_PARAMETERS);
    }

    const validationError = validatePhoneNumber(body.phoneNumber);
    if (validationError) return validationError;

    return createSession(body.phoneNumber);
  },

  "GET /api/sessions/:id": async (_req, params) => {
    return getSession(params?.id);
  },

  "DELETE /api/sessions/:id": async (_req, params) => {
    return deleteSession(params?.id as string);
  },

  "GET /api/auth/status/:sessionId": async (_req, params) => {
    return getAuthStatus(params?.sessionId);
  },

  "GET /api/messages/:sessionId": async (_req, params) => {
    const url = new URL(_req.url);
    const { limit, offset } = validatePagination(
      url.searchParams.get("limit"),
      url.searchParams.get("offset"),
    );
    return getMessages(params?.sessionId as string, limit, offset);
  },

  "GET /api/stats": async () => {
    return getOverallStats();
  },

  "GET /api/stats/:sessionId": async (_req, params) => {
    return getSessionStats(params?.sessionId as string);
  },

  "GET /api/network": async () => {
    return getNetworkState();
  },

  "GET /api/config": async () => {
    return getConfig();
  },
};

/**
 * Handle HTTP API requests
 */
export async function handleApiRequest(req: Request): Promise<ApiResponse> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  const route = matchRoute(method, path, routes);
  if (!route) {
    return createApiError(
      `${ApiResponseErrors.ROUTE_NOT_FOUND}: ${method} ${path}`,
    );
  }

  try {
    return await route.handler(req, route.params);
  } catch (error) {
    log.error(`API error on ${method} ${path}:`, error);
    return createApiError(
      error instanceof Error ? error.message : ApiResponseErrors.INTERNAL_ERROR,
    );
  }
}
