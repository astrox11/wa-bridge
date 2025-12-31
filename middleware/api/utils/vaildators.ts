import { sessionManager } from "../../../core";
import type { ApiResponse } from "../../types";
import { ApiResponseErrors } from "../../errors";

export function validateSessionId(
  sessionId: string | undefined,
): ApiResponse | null {
  if (!sessionId) {
    return { success: false, error: ApiResponseErrors.INVALID_SESSION };
  }
  return null;
}

export function validatePhoneNumber(
  phoneNumber: string | undefined,
): ApiResponse | null {
  if (!phoneNumber) {
    return { success: false, error: ApiResponseErrors.INVALID_PHONE_NUMBER };
  }
  return null;
}

export function validateSessionExists(
  sessionId: string,
):
  | { success: false; error: string }
  | { session: NonNullable<ReturnType<typeof sessionManager.get>> } {
  const session = sessionManager.get(sessionId);
  if (!session) {
    return { success: false, error: ApiResponseErrors.NO_SESSION_FOUND };
  }
  return { session };
}
