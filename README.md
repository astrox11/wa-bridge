# wa-runtime

wa-runtime is a full WhatsApp runtime that provides a backend service for session management, authentication, messaging, and statistics. It includes a web dashboard built with Astro.js for managing WhatsApp sessions.

## Features

- **Multi-session support**: Manage multiple isolated WhatsApp sessions
- **REST API**: Backend service exposing APIs for external clients
- **Web Dashboard**: Built with Astro.js for session management and monitoring
- **WhatsApp Pairing**: Uses pairing code authentication (no QR code scanning)
- **Real-time Statistics**: Track messages, uptime, and session health
- **Extensible Middleware**: Add custom behavior and business logic

## Architecture

```
wa-runtime/
├── Backend Service (Bun.js)
│   ├── Session Management API
│   ├── Authentication API
│   ├── Statistics API
│   └── WhatsApp Core (Baileys)
│
└── Frontend (astro-web-runtime)
    ├── Session Creation
    ├── Pairing Flow
    └── Dashboard
```

## Requirements

- [Node.js](https://nodejs.org/) (v20+)
- [Bun.js](https://bun.sh/)
- [ffmpeg](https://www.ffmpeg.org/)
- [libwebp](https://developers.google.com/speed/webp/download)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/astrox11/wa-runtime
cd wa-runtime
```

### 2. Install backend dependencies

```bash
bun install
```

### 3. Install frontend dependencies

```bash
cd astro-web-runtime
npm install
cd ..
```

## Running the Application

### Option 1: Run backend and frontend separately (Development)

**Terminal 1 - Backend:**
```bash
bun run server
```

**Terminal 2 - Frontend:**
```bash
cd astro-web-runtime
npm run dev
```

The backend will be available at `http://localhost:3000` and the frontend at `http://localhost:4321`.

### Option 2: Run using CLI (Session management only)

```bash
# Create a session
bun start session create 14155551234

# List all sessions
bun start session list

# Delete a session
bun start session delete <session_id>
```

### Option 3: Docker

```bash
docker build -t wa-runtime .
docker run -p 3000:3000 -p 4321:4321 wa-runtime
```

## Configuration

Configuration can be set via environment variables or the `config.ts` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PHONE_NUMBER` | Phone number for auto-session creation | - |
| `BOT_NAME` | Display name for the bot | `wa-runtime` |
| `API_PORT` | Backend API port | `3000` |
| `API_HOST` | Backend API host | `0.0.0.0` |

### Using .env file

```bash
PHONE_NUMBER=14155551234
BOT_NAME=MyBot
API_PORT=3000
```

## API Reference

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete a session |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/status/:sessionId` | Get authentication status |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get overall runtime statistics |
| GET | `/api/stats/:sessionId` | Get session-specific statistics |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get runtime configuration |

### Example: Create a Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "14155551234"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "session_14155551234",
    "pairingCode": "12345678",
    "pairingCodeFormatted": "1234-5678"
  }
}
```

## Web Dashboard

The web dashboard provides a visual interface for managing sessions:

### Home Page
- Create new sessions by entering phone number and bot name
- View existing sessions with status indicators
- Quick access to dashboard or pairing flow

### Pairing Page
- Displays the 8-digit pairing code
- Instructions for linking via WhatsApp
- Automatic redirect to dashboard on success

### Dashboard
- Session statistics (messages, uptime, health)
- Activity graphs showing messages per hour
- Runtime statistics (total sessions, server uptime)
- Session management actions (refresh, disconnect)

## Supported Platforms

- Windows
- Linux
- macOS
- Docker

**Not supported:**
- Android (Bun.js limitation)

## Middleware Extension

wa-runtime can be extended using the middleware layer:

```typescript
import { MiddlewareService, createRegistry } from './middleware';

const middleware = new MiddlewareService({
  sessionId: 'my-session',
  debug: true,
});

middleware.on('message', (message, client) => {
  console.log('Received:', message.text);
});

middleware.on('command', (message, client) => {
  console.log('Command:', message.command?.name);
});
```

## Project Structure

```
wa-runtime/
├── index.ts          # CLI entry point
├── server.ts         # Backend HTTP server
├── api.ts            # API route handlers
├── config.ts         # Configuration
├── lib/              # Core library
│   ├── core/         # Message, Group, Community handlers
│   ├── session/      # Session management
│   ├── sql/          # Database operations
│   └── util/         # Utilities
├── middleware/       # Middleware layer
└── astro-web-runtime/  # Frontend dashboard
    ├── src/
    │   ├── layouts/  # Astro layouts
    │   ├── pages/    # Page components
    │   ├── lib/      # API client
    │   └── components/
    └── public/       # Static assets
```

## Contributing

Contributions are welcome! wa-runtime is evolving and community input directly influences its direction.

Areas for contribution:
- Bug fixes
- Documentation improvements
- New features
- Middleware extensions

## License

This project is licensed under the terms specified in the LICENSE file.
