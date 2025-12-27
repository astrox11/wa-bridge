import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

export function parseEnv(file: string): Record<string, string> {
  const result: Record<string, string> = {};
  let fullPath = resolve(file);

  if (!existsSync(fullPath)) return result;

  try {
    if (statSync(fullPath).isDirectory()) {
      const candidate = join(fullPath, ".env");
      if (!existsSync(candidate) || !statSync(candidate).isFile()) {
        return result;
      }
      fullPath = candidate;
    }
  } catch {
    return result;
  }

  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) return result;

  const content = readFileSync(fullPath, "utf8");
  const lines = content.split(/\r\n|\n|\r/);

  for (const raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("export ")) line = line.replace(/^export\s+/, "");

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
      val = val
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");
    } else {
      const hashIndex = val.indexOf("#");
      if (hashIndex !== -1) {
        val = val.slice(0, hashIndex).trim();
      }
    }

    if (key) result[key] = val;
  }

  return result;
}

export function findEnvFile(dir: string): string | null {
  try {
    const files: string[] = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith(".env")) {
        const p = resolve(dir, f);
        if (existsSync(p)) return p;
      }
    }
  } catch {
    // ignore errors (e.g. missing directory / permissions)
  }

  return null;
}

export function formatRuntime(uptimeSeconds: number) {
  let seconds = Math.floor(uptimeSeconds);

  const MONTH = 30 * 24 * 3600;
  const DAY = 24 * 3600;
  const HOUR = 3600;
  const MIN = 60;

  const months = Math.floor(seconds / MONTH);
  seconds %= MONTH;

  const days = Math.floor(seconds / DAY);
  seconds %= DAY;

  const hours = Math.floor(seconds / HOUR);
  seconds %= HOUR;

  const mins = Math.floor(seconds / MIN);
  const secs = seconds % MIN;

  const parts = [];
  if (months > 0) parts.push(months + "mo");
  if (days > 0) parts.push(days + "d");
  if (hours > 0) parts.push(hours + "h");
  if (mins > 0) parts.push(mins + "m");
  if (secs > 0) parts.push(secs + "s");

  return parts.join(" ");
}

export function formatp(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
}

export function toSmallCaps(text: string): string {
  const smallCaps = [
    "ᴀ",
    "ʙ",
    "ᴄ",
    "ᴅ",
    "ᴇ",
    "ғ",
    "ɢ",
    "ʜ",
    "ɪ",
    "ᴊ",
    "ᴋ",
    "ʟ",
    "ᴍ",
    "ɴ",
    "ᴏ",
    "ᴘ",
    "ǫ",
    "ʀ",
    "s",
    "ᴛ",
    "ᴜ",
    "ᴠ",
    "ᴡ",
    "x",
    "ʏ",
    "ᴢ",
  ];
  return text
    .toUpperCase()
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return smallCaps[code - 65];
      return c;
    })
    .join("");
}
