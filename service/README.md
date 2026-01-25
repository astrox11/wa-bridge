# Whatsaly Service

The core backend for Whatsaly, built with **Rust** and **Axum**. This service manages the lifecycle of WhatsApp worker instances, tracks system performance, and provides a centralized interface for the control panel.

## Features

- **Instance Supervisor**: Manages `bun` worker processes using a robust supervisor loop that handles spawning, crashing, pausing, and resumption.
- **Process Tree Management**: Utilizes `taskkill` (on Windows) to ensure entire process trees—including orphaned browser engines—are terminated during pauses.
- **Real-time Streams**: Provides SSE (Server-Sent Events) for live system metrics (CPU, Memory, Disk) and instance status updates.
- **Protobuf Communication**: Communicates with workers over a high-performance TCP socket layer using Protocol Buffers.
- **Intelligent Startup**: Automatically restores active sessions on boot while respecting the `paused` status of dormant instances.
- **News Scraper**: Integrated utility to fetch the latest WhatsApp beta updates directly from WABetaInfo.

## Stack

- **Framework**: [Axum](https://github.com/tokio-rs/axum) with [Tokio](https://tokio.rs/) runtime.
- **Database**: SQLite for persistent session storage via [SQLx](https://github.com/launchbadge/sqlx).
- **Cache**: Redis for temporary session data and coordination.
- **Serialization**: [Prost](https://github.com/tokio-rs/prost) for Protobuf decoding.

## API Reference

### Instances

- `GET /api/instances` - List all sessions (active and dormant).
- `POST /api/instances/:phone/start` - Initialize a new worker instance.
- `POST /api/instances/:phone/pause` - Kill the process tree and set status to `paused`.
- `POST /api/instances/:phone/resume` - Restart a dead process or signal an idling supervisor to resume.

### Utilities

- `GET /util/whatsapp-news` - Scrapes the 5 most recent articles from WABetaInfo.
- `GET /api/system/stream` - Live SSE stream of host hardware metrics.
