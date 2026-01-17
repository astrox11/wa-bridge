export enum SessionStatus {
  ACTIVE = "active",
  CONNECTED = "connected",
  PAUSED = "paused",
  LOGGED_OUT = "logged_out",
  PAIRING = "pairing",
}

export interface Sessions {
  id: string;
  status: SessionStatus;
  name?: string;
  profileUrl?: string | null;
  isBusinessAccount: boolean;
  createdAt: Date;
}

export interface Devices {
  sessionId: string;
  deviceInfo?: string;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface AuthTokens {
  sessionId: string;
  token: string;
  value: string;
  createdAt: Date;
}

export interface DeviceWithAuthToken
  extends Devices, Omit<AuthTokens, "sessionId" | "createdAt"> {}

export interface SessionContacts {
  sessionId: string;
  contactInfo?: string;
  addedAt: Date;
  createdAt: Date;
}

export interface SessionMessages {
  sessionId: string;
  messageId: string;
  messageContent?: string;
  createdAt: Date;
}

export interface SessionChats {
  sessionId: string;
  chatInfo: string;
  createdAt: Date;
}

export interface SessionConfigurations {
  sessionId: string;
  configKey: string;
  configValue?: string;
  createdAt: Date;
}

export interface SessionGroups {
  sessionId: string;
  groupInfo: string;
  createdAt: Date;
}
