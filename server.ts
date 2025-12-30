/**
 * wa-runtime Backend Service
 *
 * Exposes HTTP APIs for session management, authentication, messaging, and statistics.
 * Supports multiple isolated sessions consumable by external clients.
 */

import { WebSocket } from "ws";

const wsListener = WebSocket.prototype.on || WebSocket.prototype.addListener;
const mockEvent = (event: string) =>
  event === "upgrade" || event === "unexpected-response";

if (wsListener) {
  const patch = function (this: any, event: string, listener: any) {
    if (mockEvent(event)) return this;
    return wsListener.call(this, event, listener);
  };
  if (WebSocket.prototype.on) WebSocket.prototype.on = patch;
  if (WebSocket.prototype.addListener) WebSocket.prototype.addListener = patch;
}

import { log, sessionManager } from "./lib";
import config from "./config";
import { handleApiRequest, type ApiResponse, type CorsOptions } from "./api";

/**
 * Parse CORS origins from environment variable or use defaults
 */
function getCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map(o => o.trim());
  }
  return ["http://localhost:4321", "http://127.0.0.1:4321"];
}

const corsOptions: CorsOptions = {
  allowedOrigins: getCorsOrigins(),
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  allowCredentials: true,
};

/**
 * Create CORS headers for response
 */
function createCorsHeaders(
  origin: string | null,
  options: CorsOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": options.allowedMethods.join(", "),
    "Access-Control-Allow-Headers": options.allowedHeaders.join(", "),
  };

  if (options.allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  // Check if origin is allowed
  if (origin && options.allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (options.allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

/**
 * Determine HTTP status code from API response
 */
function getHttpStatusCode(data: ApiResponse): number {
  if (data.success) {
    return 200;
  }
  if (data.error?.includes("not found")) {
    return 404;
  }
  return 400;
}

/**
 * Create HTTP response with proper headers
 */
function createResponse(
  data: ApiResponse,
  origin: string | null,
): Response {
  const corsHeaders = createCorsHeaders(origin, corsOptions);

  return new Response(JSON.stringify(data), {
    status: getHttpStatusCode(data),
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/**
 * Handle preflight OPTIONS request
 */
function handleOptionsRequest(origin: string | null): Response {
  const corsHeaders = createCorsHeaders(origin, corsOptions);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Main server handler
 */
const server = Bun.serve({
  port: config.API_PORT,
  hostname: config.API_HOST,
  async fetch(req) {
    const origin = req.headers.get("Origin");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return handleOptionsRequest(origin);
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path === "/health" && req.method === "GET") {
      return createResponse(
        {
          success: true,
          data: {
            status: "healthy",
            version: config.VERSION,
            uptime: process.uptime(),
          },
        },
        origin,
      );
    }

    // API routes
    if (path.startsWith("/api/")) {
      const result = await handleApiRequest(req);
      return createResponse(result, origin);
    }

    // 404 for unknown routes
    return createResponse(
      { success: false, error: "Not found" },
      origin,
    );
  },
});

log.info(`wa-runtime backend server running on http://${config.API_HOST}:${config.API_PORT}`);

// Restore existing sessions on startup
sessionManager.restoreAllSessions().then(() => {
  log.info("Session restoration complete");
}).catch((error) => {
  log.error("Failed to restore sessions:", error);
});

export { server };
