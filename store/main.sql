PRAGMA foreign_keys = ON;

-- 1. Sessions Table
CREATE TABLE
    IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        name TEXT,
        profileUrl TEXT,
        isBusinessAccount BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);

-- 2. Devices Table
CREATE TABLE
    IF NOT EXISTS devices (
        sessionId TEXT PRIMARY KEY,
        deviceInfo TEXT,
        lastSeenAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- 3. Auth Tokens Table
CREATE TABLE
    IF NOT EXISTS auth_tokens (
        sessionId TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        value TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- 4. Session Contacts Table
CREATE TABLE
    IF NOT EXISTS session_contacts (
        sessionId TEXT PRIMARY KEY,
        contactInfo TEXT,
        addedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- 5. Session Messages Table
CREATE TABLE
    IF NOT EXISTS session_messages (
        sessionId TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        messageContent TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

-- 6. Session Chats Table
CREATE TABLE
    IF NOT EXISTS session_chats (
        sessionId TEXT NOT NULL,
        chatInfo TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_session_chats_session_id ON session_chats (sessionId);

-- 7. Session Configurations Table
CREATE TABLE
    IF NOT EXISTS session_configurations (
        sessionId TEXT PRIMARY KEY,
        configKey TEXT NOT NULL,
        configValue TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_session_configurations_session_id ON session_configurations (sessionId);

-- 8. Session Groups Table
CREATE TABLE
    IF NOT EXISTS session_groups (
        sessionId TEXT NOT NULL,
        groupInfo TEXT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );