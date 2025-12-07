import { jidNormalizedUser, type WASocket } from "baileys";
import * as fs from "fs";
import * as path from "path";
import { log } from "../debug";
import type { Message } from "./Message";

const fsPromises = fs.promises;

export class Plugins {
  message: Message;
  client: WASocket;

  constructor(message: Message, client: WASocket) {
    this.message = message;
    this.client = client;
  }

  async text() {
    if (this.message && this.message?.text) {
      const text = this.message.text.replace(/^\s+|\s+$/g, "");
      log.debug(`[text] Received command: ${text}`);
      const cmd = this.find(text);
      log.debug(`[text] Found command: ${cmd?.pattern ?? "none"}`);

      if (cmd) {
        try {
          log.debug("Executing command...");
          await cmd.exec(this.message, this.client);
        } catch (error) {
          log.error("[text] CMD ERROR:", error);
        }
      }
    }
  }

  sticker() {
    // Implement for sticker based trigger
  }

  private pathIndex = new Map<string, CommandProperty>();
  private nameIndex = new Map<string, CommandProperty>();

  /**
   * Register a command property. Accepts undefined safely so callers can
   * pass the import result directly without pre-checks.
   */
  register(prop: CommandProperty | undefined, filePath?: string) {
    if (!prop) {
      log.debug(
        `[register] called with empty prop for filePath=${filePath ?? "unknown"}`,
      );
      return;
    }

    if (!prop.pattern || typeof prop.pattern !== "string") {
      log.error(
        `[register] invalid pattern in prop from ${filePath ?? "inline"} ->`,
        prop,
      );
      return;
    }

    const k = prop.pattern.toLowerCase();
    log.debug(
      `[register] registering pattern=${k} category=${prop.category} file=${filePath ?? "inline"}`,
    );

    if (filePath) {
      const prev = this.pathIndex.get(filePath);
      if (prev) {
        log.debug(
          `[register] replacing previous registration from same file: ${filePath} prevPattern=${prev.pattern}`,
        );
        this.nameIndex.delete(prev.pattern.toLowerCase());
        if (Array.isArray(prev.alias)) {
          for (const a of prev.alias) {
            if (typeof a === "string") this.nameIndex.delete(a.toLowerCase());
          }
        }
      }
      this.pathIndex.set(filePath, prop);
    }

    this.nameIndex.set(k, prop);

    if (Array.isArray(prop.alias)) {
      for (const a of prop.alias) {
        if (typeof a === "string") {
          log.debug(`[register] adding alias=${a.toLowerCase()} -> ${k}`);
          this.nameIndex.set(a.toLowerCase(), prop);
        } else {
          log.warn(`[register] skipping non-string alias for pattern=${k}`, a);
        }
      }
    }

    log.debug(`[register] total commands loaded=${this.nameIndex.size}`);
  }

  /**
   * Load a directory of plugin files and watch for changes.
   * Only files with extensions present in ext will be imported.
   */
  async load(dir = "lib/plugin", ext = [".js", ".ts"]) {
    const base = path.resolve(process.cwd(), dir);
    log.debug(`[load] plugin base = ${base} ext=${ext.join(",")}`);

    try {
      await fsPromises.mkdir(base, { recursive: true });
      log.debug(`[load] ensured directory exists: ${base}`);
    } catch (err) {
      log.error(`[load] failed to ensure directory ${base}:`, err);
      return;
    }

    try {
      const files = await fsPromises.readdir(base);
      log.debug(`[load] files found: ${files.length}`);

      for (const f of files) {
        const full = path.join(base, f);
        const s = await fsPromises.stat(full).catch(() => null);
        if (!s || !s.isFile()) {
          log.debug(`[load] skipping not-file: ${full}`);
          continue;
        }
        if (!ext.includes(path.extname(f))) {
          log.warn(`[load] skipping extension mismatch: ${full}`);
          continue;
        }

        await this.loadFile(full);
      }
    } catch (err) {
      log.debug(`[load] readdir error:`, err);
    }

    // Watch plugin folder for changes
    try {
      fs.watch(base, (evt, filename) => {
        if (!filename) return;
        const full = path.join(base, filename);
        if (!ext.includes(path.extname(filename))) {
          log.debug(
            `[watch] skipping file change ext not allowed: ${filename}`,
          );
          return;
        }

        setTimeout(async () => {
          await fsPromises.stat(full).catch(() => null);
          log.debug(`[watch] detected change, reloading: ${full}`);
          await this.loadFile(full);
        }, 80);
      });

      log.debug(`[load] filesystem watch started on ${base}`);
    } catch (err) {
      log.error(`[load] watch error:`, err);
    }
  }

  private async loadFile(filePath: string) {
    log.debug(`[loadFile] attempting to load: ${filePath}`);

    // protect against invalid paths early
    const ext = path.extname(filePath);
    if (![".js", ".ts"].includes(ext)) {
      log.warn(
        `[loadFile] skipping unsupported extension ${ext} for ${filePath}`,
      );
      return;
    }

    try {
      const url = pathToFileUrl(filePath) + `?t=${Date.now()}`;
      log.debug(`[loadFile] importing url: ${url}`);
      const mod = await import(url).catch((err) => {
        log.error(`[loadFile] import failed for ${filePath}:`, err);
        return null;
      });

      if (!mod) {
        log.warn(`[loadFile] no module exported from ${filePath}`);
        return;
      }

      const cmd = (mod?.command ?? mod?.default) as CommandProperty | undefined;

      if (!cmd) {
        log.debug(
          `[loadFile] module has no 'command' or 'default' export: ${filePath}`,
          Object.keys(mod),
        );
        return;
      }

      // defensive validation
      if (!cmd.pattern || typeof cmd.pattern !== "string") {
        log.debug(
          `[loadFile] loaded command missing valid pattern for file ${filePath}`,
          cmd,
        );
        return;
      }

      // register it
      this.register(cmd, filePath);
      log.debug(
        `[loadFile] successfully loaded and registered ${cmd.pattern} from ${filePath}`,
      );
    } catch (err) {
      log.error(`[loadFile] unexpected error loading ${filePath}:`, err);
    }
  }

  private config() {
    return {
      prefix: ".",
      sudo: [this.client.user?.phoneNumber, this.client.user?.lid]
        .map((v) => jidNormalizedUser(v))
        .filter(Boolean),
      banned: [],
    };
  }

  private find(query: string | RegExp) {
    if (typeof query === "string") {
      const k = query.toLowerCase();
      return this.nameIndex.get(k) || null;
    }

    if (query instanceof RegExp) {
      for (const [key, cmd] of this.nameIndex.entries()) {
        if (query.test(key)) return cmd;
      }
    }

    return null;
  }

  findAll() {
    return Array.from(this.nameIndex.values());
  }
}

export interface CommandProperty {
  pattern: string;
  alias?: Array<string>;
  desc?: string;
  category: CommandCategories;
  exec: (msg: Message, sock?: WASocket) => Promise<any>;
}

type CommandCategories = "p2p" | "groups" | "newsletter" | "status" | "util";

function pathToFileUrl(p: string) {
  let r = p;
  if (!path.isAbsolute(r)) r = path.resolve(process.cwd(), r);
  r = r.replace(/\\/g, "/");
  if (!r.startsWith("/")) r = "/" + r;
  return `file://${r}`;
}
