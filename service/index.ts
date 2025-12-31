/**
 * Service Layer
 *
 * Provides HTTP API and WebSocket request handling for the Whatsaly dashboard.
 * Consistent with the middleware layer structure.
 */

// Re-export middleware for service access
export * from "./middleware";

// Export service-specific types (types that re-export from middleware won't conflict)
export type {
  SessionCreateRequest,
  WsAction,
  WsRequest,
  WsResponse,
  WsResponsePayloads,
  MessageResult,
  NetworkStateData,
  StatsUpdate,
  RouteHandler,
} from "./types";

// Export service-specific errors
export { ApiResponseErrors, WsResponseErrors } from "./errors";

// Export predicates/validators
export {
  validateSessionId,
  validatePhoneNumber,
  validateNumericParam,
  validatePagination,
  isValidWsAction,
  validateWsRequest,
  parseWsRequest,
  requiresSessionId,
  requiresPhoneNumber,
  validateActionParams,
} from "./predicates";

// Export handler utilities
export {
  parseBody,
  createWsResponse,
  createWsErrorResponse,
  handleWsAction,
  handleRawWsMessage,
  matchRoute,
  createApiError,
  createApiSuccess,
} from "./handler";

// Export API handling
export { handleApiRequest } from "./api";
