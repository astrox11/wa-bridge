<div align="center">
  <a href="https://golang.org/">
    <img src="./ui/logo.png" width="280" height="280" />
  </a>
</div>

# Setup Instructions

## Prerequisites

Install the following on your system.

- [Docker](https://www.docker.com/get-started)

- [Docker Compose](https://docs.docker.com/compose/install/)

## Installation

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

# Contributing

Please read the [Guidelines](CONTRIBUTING.md) before submitting pull requests.
