/**
 * Service layer error definitions
 * Re-exports middleware errors and adds service-specific errors
 */

// Re-export middleware errors for consistency
export { ApiResponseErrors } from "../middleware/errors";

/**
 * WebSocket Response Errors - service-specific for WebSocket action responses
 */
export enum WsResponseErrors {
  UNKNOWN_ACTION = "unknown_action",
  INVALID_REQUEST = "invalid_request",
  MISSING_PARAMS = "missing_required_params",
  SESSION_NOT_FOUND = "session_not_found",
  ACTION_FAILED = "action_failed",
  CONNECTION_ERROR = "connection_error",
}
