import { bunql } from "./init";
import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type SignalDataSet,
  type SignalDataTypeMap,
} from "baileys";

export const Auth = bunql.define("auth", {
  name: { type: "TEXT", primary: true },
  data: { type: "TEXT" },
});

export const useBunqlAuth = async () => {
  const writeData = async (data: any, name: string) => {
    const findResult = Auth.find({ name }).run();

    const existing = findResult[0];

    if (existing) {
      Auth.update({ data: JSON.stringify(data) })
        .where("name", "=", name)
        .run();
    } else {
      Auth.insert({ name, data: JSON.stringify(data) });
    }
  };

  const readData = async (name: string) => {
    const findResult = Auth.find({ name }).run();
    const existing = findResult[0];

    if (existing) return JSON.parse(existing.data, BufferJSON.reviver);
    return null;
  };

  const removeData = async (name: string) => {
    Auth.delete().where("name", "=", name).run();
  };

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
          const data: { [_: string]: SignalDataTypeMap[T] } = {};

          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);

              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            }),
          );

          return data;
        },
        set: async (data: SignalDataSet) => {
          const tasks: Promise<void>[] = [];

          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];
              const name = `${category}-${id}`;

              if (value) {
                tasks.push(writeData(value, name));
              } else {
                tasks.push(removeData(name));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return await writeData(creds, "creds");
    },
  };
};
