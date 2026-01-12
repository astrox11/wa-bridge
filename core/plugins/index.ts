import { join, isAbsolute } from "path";
import { readdirSync } from "fs";
import { cwd } from "process";
import { pathToFileURL } from "url";
import type { SerializedMessage } from "../seralize";

export interface Command {
  pattern?: string;
  alias?: Array<string>;
  fromMe?: boolean;
  isGroup?: boolean;
  category?: CommandCategory;
  event?: boolean;
  dontAddToCommandList?: boolean;
  function: (message: SerializedMessage, args?: string) => CommandExecution;
}

type CommandExecution = Promise<void> | Promise<unknown>;

type CommandCategory =
  | "p2p"
  | "group"
  | "newsletter"
  | "community"
  | "downloader"
  | "business"
  | "games"
  | "system";

export const commands = new Map<string, Command>();

export const loadPlugins = async (
  directory: string = join(cwd(), "plugins", "commands")
) => {
  try {
    const files = readdirSync(directory).filter(
      (file) => file.endsWith(".ts") || file.endsWith(".js")
    );

    for (const file of files) {
      try {
        const absolutePath = isAbsolute(file) ? file : join(directory, file);
        const fileUrl = pathToFileURL(absolutePath).href;
        const module = await import(fileUrl);
        const commandData: Command | Command[] = module.default || module;

        if (Array.isArray(commandData)) {
          commandData.forEach(addCommandToMap);
        } else if (commandData) {
          addCommandToMap(commandData);
        }
      } catch (error) {
        console.error(`Failed to load plugin: ${file}`, error);
      }
    }
  } catch (dirError) {
    console.error(`Could not read directory: ${directory}`, dirError);
  }
};

const addCommandToMap = (cmd: Command) => {
  if (cmd.pattern) {
    commands.set(cmd.pattern.trim(), cmd);
  }

  if (cmd.alias) {
    cmd.alias.forEach((a) => commands.set(a.trim(), cmd));
  }

  if (cmd.event && !cmd.pattern) {
    const eventKey = `event_${
      cmd.function.name || Math.random().toString(36).slice(2, 9)
    }`;
    commands.set(eventKey, cmd);
  }
};

export const findCommand = (name: string): Command | undefined => {
  return commands.get(name.trim());
};

export const getAllCommands = (): Command[] => {
  return Array.from(new Set(commands.values()));
};

export const getAllEvents = (): Command[] => {
  return getAllCommands().filter((cmd) => cmd?.event === true);
};
