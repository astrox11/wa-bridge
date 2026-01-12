import { findCommand, getAllEvents } from "./plugins";
import type { SerializedMessage } from "./seralize";
import config from "./config";

export const logForGo = (tag: string, data: any) => {
  const output = {
    tag: tag,
    timestamp: new Date().toISOString(),
    payload: data,
  };
  console.log(`[GO_DATA] ${JSON.stringify(output)}`);
};

export const handleCommand = async (msg: SerializedMessage) => {
  if (!msg?.text) return;

  const args = msg.text?.split(" ")[1];

  const cmd = findCommand(msg.text);
  await cmd?.function(msg, args);
};

export const handleEvent = async (msg: SerializedMessage) => {
  const commands = getAllEvents();

  for (const cmd of commands) {
    await cmd?.function(msg);
  }
};

export const parseEnv = (buffer: Buffer) => {
  const lines = buffer.toString().split(/\r?\n/);
  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...values] = trimmed.split("=");
    const value = values.join("=").trim();

    if (key) {
      result[key.trim()] = value.replace(/^['"]|['"]$/g, "");
    }
  }

  return result;
};

export const makeQuery = async (
  path: string,
  type: "POST" | "GET",
  body?: Record<string, any>
) => {
  const PORT = config.PORT || 8080;
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    const options: RequestInit = {
      method: type,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (type === "POST" && body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}/${path.replace(/^\//, "")}`, options);

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }

    return null;
  } catch (error) {
    return null;
  }
};

export {
  parse_content,
  extract_text_from_message,
  get_content_type,
} from "../util/pkg/util.js";
