/**
 * Service layer predicates and validators
 * Consistent with middleware/api/utils/vaildators.ts pattern
 */

import type { ApiResponse, WsRequest, WsAction } from "./types";
import { ApiResponseErrors, WsResponseErrors } from "./errors";

/**
 * Validate session ID parameter
 * Returns error response if invalid, null if valid
 */
export function validateSessionId(
  sessionId: string | undefined,
): ApiResponse | null {
  if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
    return { success: false, error: ApiResponseErrors.INVALID_SESSION };
  }
  return null;
}

/**
 * Validate phone number parameter
 * Returns error response if invalid, null if valid
 */
export function validatePhoneNumber(
  phoneNumber: string | undefined,
): ApiResponse | null {
  if (
    !phoneNumber ||
    typeof phoneNumber !== "string" ||
    phoneNumber.trim() === ""
  ) {
    return { success: false, error: ApiResponseErrors.INVALID_PHONE_NUMBER };
  }
  return null;
}

/**
 * Validate numeric parameter
 * Returns a validated number or default value
 */
export function validateNumericParam(
  value: unknown,
  defaultValue: number,
): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit: unknown,
  offset: unknown,
): { limit: number; offset: number } {
  return {
    limit: validateNumericParam(limit, 100),
    offset: validateNumericParam(offset, 0),
  };
}

/**
 * WebSocket request predicates
 */

const VALID_WS_ACTIONS: WsAction[] = [
  "getSessions",
  "getSession",
  "createSession",
  "deleteSession",
  "getAuthStatus",
  "getStats",
  "getSessionStats",
  "getMessages",
  "getConfig",
  "getNetworkState",
  "getGroups",
  "pauseSession",
  "resumeSession",
];

/**
 * Check if a string is a valid WebSocket action
 */
export function isValidWsAction(action: string): action is WsAction {
  return VALID_WS_ACTIONS.includes(action as WsAction);
}

/**
 * Validate WebSocket request structure
 * Returns error message if invalid, null if valid
 */
export function validateWsRequest(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return WsResponseErrors.INVALID_REQUEST;
  }

  const request = data as Record<string, unknown>;

  if (!request.action || typeof request.action !== "string") {
    return WsResponseErrors.INVALID_REQUEST;
  }

  if (!isValidWsAction(request.action)) {
    return WsResponseErrors.UNKNOWN_ACTION;
  }

  return null;
}

/**
 * Parse WebSocket request safely
 * Returns parsed request or null if parsing fails
 */
export function parseWsRequest(data: unknown): WsRequest | null {
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  const error = validateWsRequest(data);
  if (error) {
    return null;
  }

  return data as WsRequest;
}

/**
 * Check if request requires session ID parameter
 */
export function requiresSessionId(action: WsAction): boolean {
  const actionsRequiringSession: WsAction[] = [
    "getSession",
    "deleteSession",
    "getAuthStatus",
    "getSessionStats",
    "getMessages",
    "getGroups",
    "pauseSession",
    "resumeSession",
  ];
  return actionsRequiringSession.includes(action);
}

/**
 * Check if request requires phone number parameter
 */
export function requiresPhoneNumber(action: WsAction): boolean {
  return action === "createSession";
}

/**
 * Validate request parameters based on action
 */
export function validateActionParams(
  action: WsAction,
  params: Record<string, unknown> | undefined,
): string | null {
  if (requiresSessionId(action)) {
    const sessionId = params?.id ?? params?.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return WsResponseErrors.MISSING_PARAMS;
    }
  }

  if (requiresPhoneNumber(action)) {
    if (!params?.phoneNumber || typeof params.phoneNumber !== "string") {
      return WsResponseErrors.MISSING_PARAMS;
    }
  }

  return null;
}
