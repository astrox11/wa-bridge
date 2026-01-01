import {
  sessionManager,
  getAllMessages,
  getMessagesCount,
  getAllGroups,
  StatusType,
} from "../core";
import config from "../config";
import type {
  ApiResponse,
  SessionData,
  SessionCreateResult,
  AuthStatusData,
  SessionStatsData,
  OverallStatsData,
  MessagesData,
  ConfigData,
  GroupsData,
} from "./types";

class RuntimeStats {
  private sessionStats = new Map<
    string,
    { messagesReceived: number; messagesSent: number }
  >();
  private totalMessages = 0;

  initSession(sessionId: string): void {
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, {
        messagesReceived: 0,
        messagesSent: 0,
      });
    }
  }

  recordMessageReceived(sessionId: string): void {
    const stats = this.sessionStats.get(sessionId);
    if (stats) {
      stats.messagesReceived++;
      this.totalMessages++;
    }
  }

  recordMessageSent(sessionId: string): void {
    const stats = this.sessionStats.get(sessionId);
    if (stats) {
      stats.messagesSent++;
      this.totalMessages++;
    }
  }

  getStats(sessionId: string): SessionStatsData {
    const stats = this.sessionStats.get(sessionId);
    if (!stats) {
      return { messagesReceived: 0, messagesSent: 0 };
    }
    return {
      messagesReceived: stats.messagesReceived,
      messagesSent: stats.messagesSent,
    };
  }

  getOverallStats(): OverallStatsData {
    const sessions = sessionManager.listExtended();
    const activeSessions = sessions.filter(
      (s) => s.status === StatusType.Connected || s.status === StatusType.Active,
    ).length;

    return {
      totalSessions: sessions.length,
      activeSessions,
      totalMessages: this.totalMessages,
      version: config.VERSION,
    };
  }

  removeSession(sessionId: string): void {
    this.sessionStats.delete(sessionId);
  }
}

export const runtimeStats = new RuntimeStats();

function getStatusString(status: number): string {
  switch (status) {
    case StatusType.Connected:
    case StatusType.Active:
      return "active";
    case StatusType.Pairing:
      return "pairing";
    case StatusType.PausedUser:
      return "paused_user";
    case StatusType.Disconnected:
    case StatusType.Inactive:
      return "inactive";
    default:
      return "inactive";
  }
}

export function getSessions(): ApiResponse<SessionData[]> {
  const sessions = sessionManager.listExtended();
  return {
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      phone_number: s.phone_number,
      status: s.status,
      user_info: s.user_info ?? null,
      created_at: s.created_at,
    })),
  };
}

export function getSession(
  idOrPhone: string | undefined,
): ApiResponse<SessionData> {
  if (!idOrPhone) {
    return { success: false, error: "Session ID is required" };
  }

  const session = sessionManager.get(idOrPhone);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  return {
    success: true,
    data: {
      id: session.id,
      phone_number: session.phone_number,
      status: session.status,
      user_info: session.user_info ?? null,
      created_at: session.created_at,
    },
  };
}

export async function createSession(
  phoneNumber: string,
): Promise<ApiResponse<SessionCreateResult>> {
  const result = await sessionManager.create(phoneNumber);

  if (!result.success || !result.id) {
    return { success: false, error: result.error || "Failed to create session" };
  }

  runtimeStats.initSession(result.id);

  return {
    success: true,
    data: {
      id: result.id,
      code: result.code,
    },
  };
}

export async function deleteSession(
  idOrPhone: string,
): Promise<ApiResponse<{ message: string }>> {
  const result = await sessionManager.delete(idOrPhone);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  runtimeStats.removeSession(idOrPhone);

  return {
    success: true,
    data: { message: "Session deleted successfully" },
  };
}

export async function pauseSession(
  idOrPhone: string,
): Promise<ApiResponse<{ message: string }>> {
  const result = await sessionManager.pause(idOrPhone);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: { message: "Session paused successfully" },
  };
}

export async function resumeSession(
  idOrPhone: string,
): Promise<ApiResponse<{ message: string }>> {
  const result = await sessionManager.resume(idOrPhone);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: { message: "Session resumed successfully" },
  };
}

export function getAuthStatus(
  sessionId: string | undefined,
): ApiResponse<AuthStatusData> {
  if (!sessionId) {
    return { success: false, error: "Session ID is required" };
  }

  const session = sessionManager.get(sessionId);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const isAuthenticated = session.status === StatusType.Connected || session.status === StatusType.Active;

  return {
    success: true,
    data: {
      isAuthenticated,
      status: getStatusString(session.status),
      phoneNumber: session.phone_number,
    },
  };
}

export function getOverallStats(): ApiResponse<OverallStatsData> {
  return {
    success: true,
    data: runtimeStats.getOverallStats(),
  };
}

export function getSessionStats(
  sessionId: string,
): ApiResponse<SessionStatsData> {
  if (!sessionId) {
    return { success: false, error: "Session ID is required" };
  }

  const session = sessionManager.get(sessionId);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  return {
    success: true,
    data: runtimeStats.getStats(sessionId),
  };
}

export function getMessages(
  sessionId: string,
  limit: number = 100,
  offset: number = 0,
): ApiResponse<MessagesData> {
  if (!sessionId) {
    return { success: false, error: "Session ID is required" };
  }

  const session = sessionManager.get(sessionId);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  try {
    const messages = getAllMessages(sessionId, limit, offset);
    const total = getMessagesCount(sessionId);

    return {
      success: true,
      data: {
        messages,
        total,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get messages",
    };
  }
}

export function getConfig(): ApiResponse<ConfigData> {
  return {
    success: true,
    data: {
      version: config.VERSION,
      botName: config.BOT_NAME,
    },
  };
}

export function getGroups(sessionId: string): ApiResponse<GroupsData> {
  if (!sessionId) {
    return { success: false, error: "Session ID is required" };
  }

  const session = sessionManager.get(sessionId);
  if (!session) {
    return { success: false, error: "Session not found" };
  }

  try {
    const groups = getAllGroups(sessionId);

    return {
      success: true,
      data: {
        groups,
        total: groups.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get groups",
    };
  }
}
