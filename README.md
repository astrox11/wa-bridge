# Whatsaly

Whatsaly is an open source WhatsApp Web runtime built on Baileys and Astro.js. It implements these libraries to create a privacy focused web client with automated session lifecycle management, messaging, authentication, and statistical reporting. A modern web dashboard provides visibility and control over WhatsApp connections, and system state.

## Features

- Multi-session support
- Pairing authentication
- Automated session management
- Live metrics utilty
- Debug mode

## Setup Instructions

#### Prerequisites

Ensure these are installed on your system.

[Bun.js](https://bun.sh)
[Node.js](https://nodejs.org)
[FFmpeg](https://ffmpeg.org)
[libwebp](https://developers.google.com/speed/webp)

#### Installation

```bash
git clone https://github.com/astrox11/Whatsaly
cd Whatsaly
bun i
```

#### Starting Whatsaly

```bash
bun run start
```

```bash
bun run dev
```

## Contributing

Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

## Acknowledgements

This project uses the following open-source libraries:

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Astro.js](https://astro.build/) - Web framework

Special thanks to all contributors and the open-source community.
