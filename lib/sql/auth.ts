import { bunql } from "./_sql";
import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type SignalDataSet,
  type SignalDataTypeMap,
} from "baileys";
import { Mutex } from "async-mutex";
import { addContact } from "./contact";

const mutex = new Mutex();

export const Auth = bunql.define("auth", {
  name: { type: "TEXT", primary: true },
  data: { type: "TEXT", notNull: true },
});

export const useBunqlAuth = async () => {
  const writeData = async (data: any, name: string) =>
    mutex.runExclusive(() => {
      const row = Auth.find({ name }).run()[0];
      const payload = JSON.stringify(data, BufferJSON.replacer);

      if (row) {
        Auth.update({ data: payload }).where("name", "=", name).run();
      } else {
        Auth.insert({ name, data: payload });
      }
    });

  const readData = async (name: string) =>
    mutex.runExclusive(() => {
      const row = Auth.find({ name }).run()[0];
      return row ? JSON.parse(row.data, BufferJSON.reviver) : null;
    });

  const removeData = async (name: string) =>
    mutex.runExclusive(() => {
      Auth.delete().where("name", "=", name).run();
    });

  const creds: AuthenticationCreds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[],
        ) => {
          const out: { [id: string]: SignalDataTypeMap[T] } = {};

          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);

              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              out[id] = value;
            }),
          );

          return out;
        },

        set: async (data: SignalDataSet) => {
          const tasks: Promise<void>[] = [];

          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];

              const key = `${category}-${id}`;
              if (key.includes("lid-mapping")) {
                handleLidMapping(key, value as string);
              }
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }

          await Promise.all(tasks);
        },
      },
    },

    saveCreds: async () => {
      await writeData(creds, "creds");
    },
  };
};

function handleLidMapping(key: string, value: string) {
  const isPn = !key.includes("reverse");

  if (isPn) {
    key = key.split("-")[2];
    value = value.replace(/^"|"$/g, "");

    addContact(key, value);
  } else {
    key = key.split("-")[2].split("_")[0];
    value = value.replace(/^"|"$/g, "");

    addContact(value, key);
  }
}
