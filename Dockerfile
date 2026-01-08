FROM oven/bun:latest

RUN apt-get update && apt-get install -y \
    git \
    curl \
    ffmpeg \
    libwebp-dev \
    ca-certificates \
    golang \
    && rm -rf /var/lib/apt/lists/*

RUN bun -v && go version

RUN git clone https://github.com/astrox11/Whatsaly /root/Whatsaly

WORKDIR /root/Whatsaly

RUN cd core && bun install && cd ..

RUN cd api && go mod download

EXPOSE 8000

WORKDIR /root/Whatsaly/api

CMD ["go", "run", "main.go"]
