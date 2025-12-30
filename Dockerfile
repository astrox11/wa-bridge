FROM oven/bun:latest

RUN apt-get update && apt-get install -y \
    curl \
    git \
    ffmpeg \
    libwebp-dev \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_25.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN node -v && npm -v && bun -v

# Clone and setup wa-runtime backend
RUN git clone https://github.com/astrox11/wa-runtime /root/wa-runtime

WORKDIR /root/wa-runtime

RUN bun install

# Install and build frontend
WORKDIR /root/wa-runtime/astro-web-runtime
RUN npm install
RUN npm run build

WORKDIR /root/wa-runtime

# Expose ports for backend (3000) and frontend (4321)
EXPOSE 3000 4321

# Start both backend and frontend
CMD ["sh", "-c", "bun run server & cd astro-web-runtime && npm start"]
