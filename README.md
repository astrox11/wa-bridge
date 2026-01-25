<div align="center">
  <a href="https://golang.org/">
    <img src="./interface/logo.jpg" width="280" height="280" />
  </a>
</div>

## Features

- Multi-session support
- Automated session management
- Live metrics utility
- Powerfull service orchestration with process management
- Server-Sent Events for real-time updates

## Setup Instructions

#### Prerequisites

Ensure these are installed on your system.

- [Docker](https://www.docker.com/get-started)

- [Docker Compose](https://docs.docker.com/compose/install/)

#### Installation

The easiest way to get Whatsaly running is using Docker Compose. This packages the Go core and the Bun environment into a single deployment.

1. **Clone the repository:**

```bash
git clone https://github.com/astrox11/Whatsaly
cd Whatsaly
```

2. **Start the container:**

```bash
docker-compose up -d
```

3. **Check container logs:**

```bash
docker-compose logs -f whatsaly
```

## Contributing

Please read the [Guidelines](CONTRIBUTING.md) before submitting pull requests.

## Acknowledgements

This project uses the Baileys library:

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API

Special thanks to all contributors and the open-source community.
