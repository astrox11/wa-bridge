/**
 * Middleware layer error definitions
 */

export enum ApiResponseErrors {
  INVALID_SESSION = "invalid_session_id_parameter",
  INVALID_PHONE_NUMBER = "invalid_phone_number_parameter",
  NO_SESSION_FOUND = "no_session_data_found",
  GROUPS_REQUEST_ERROR = "group_retrieval_failed",
  INVALID_PARAMETERS = "invalid_parameters",
  ROUTE_NOT_FOUND = "route_not_found",
  INTERNAL_ERROR = "internal_server_error",
}

