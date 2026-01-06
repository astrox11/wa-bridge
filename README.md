# Whatsaly

Whatsaly is an open-source WhatsApp client for automated messaging, event scheduling, group management, and built-in analytics.

## Features

- Multi-session support
- Pairing authentication
- Automated session management
- Live metrics utilty
- Debug mode
- Go server orchestration with process management

## Architecture

Whatsaly uses a two-tier architecture:

1. **Go Proxy Server** (port 8000) - Main entry point that:
   - Manages the BunJS process lifecycle (start/stop/restart)
   - Proxies HTTP and WebSocket requests to the Bun backend
   - Provides process status API endpoints

2. **Bun Backend** (internal port 8001) - Core runtime that:
   - Handles WhatsApp session management via Baileys
   - Serves the Astro.js SSR frontend
   - Provides WebSocket API for real-time communication

## Setup Instructions

#### Prerequisites

Ensure these are installed on your system.

- [Go](https://golang.org)
- [Bun.js](https://bun.sh)
- [FFmpeg](https://ffmpeg.org)
- [libwebp](https://developers.google.com/speed/webp)

#### Installation

```bash
git clone https://github.com/astrox11/Whatsaly
cd Whatsaly
bun i
```

#### Starting with Go Server (Recommended)

```bash
go run cmd/server/main.go
```

The Go server will automatically start the Bun backend and proxy requests. Access the application at `http://localhost:8000`.

#### Starting Bun Only (Development)

```bash
bun run start
```

```bash
bun run dev
```

## Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

## Acknowledgements

This project uses the Baileys library:

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API

Special thanks to all contributors and the open-source community.
