import type { CacheStore, Contact, WASocket } from "baileys";

export interface Session {
  id: string;
  phone_number: string;
  status: StatusType;
  client?: WASocket | null;
  user_info?: Contact | null;
  msgRetryCounterCache?: CacheStore;
  created_at?: number;
}

export enum StatusType {
  "Connecting" = 1,
  "Connected" = 2,
  "Disconnected" = 3,
  "Pairing" = 4,
  "PausedUser" = 5,
  "PausedNetwork" = 6,
  "Active" = 7,
  "Inactive" = 8,
}

export enum SessionErrorType {
  "SessionNotFound" = "SessionNotFound",
  "InvalidStatus" = "InvalidStatus",
  "AlreadyConnected" = "AlreadyConnected",
  "ConnectionFailed" = "ConnectionFailed",
  "SessionPaused" = "SessionPaused",
  "SessionAlreadyActive" = "SessionAlreadyActive",
}
