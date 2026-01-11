FROM oven/bun:1.0-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    ffmpeg \
    libwebp-dev \
    ca-certificates \
    golang \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY core/package.json core/bun.lock ./core/
RUN cd core && bun install || true

COPY api/go.mod api/go.sum ./api/
RUN cd api && go mod download

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "cd api && go run main.go"]