# Whatsaly

<a href="https://golang.org/"><img src="./interface/logo.png" width="250" height="150" /></a>

An automated WhatsApp client featuring event scheduling, group management, and built-in analytics.

## Features

- Multi-session support
- Automated session management
- Live metrics utility
- Go server orchestration with process management
- Server-Sent Events for real-time updates

## Setup Instructions

#### Prerequisites

Ensure these are installed on your system.

- [Docker](https://www.docker.com/get-started)

- [Docker Compose](https://docs.docker.com/compose/install/)

#### Installation

The easiest way to get Whatsaly running is using Docker Compose. This packages the Go core and the Bun environment into a single deployment.

**Clone the repository:**

```bash
git clone https://github.com/astrox11/Whatsaly
cd Whatsaly
```

**Start the container:**

```bash
docker-compose up -d
```

Access the application: The API will be available at http://localhost:8080 (or your configured port).

## Contributing

Please read the [Guidelines](CONTRIBUTING.md) before submitting pull requests.

## Acknowledgements

This project uses the Baileys library:

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API

Special thanks to all contributors and the open-source community.
