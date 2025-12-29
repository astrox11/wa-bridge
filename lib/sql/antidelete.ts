import { bunql } from "./_sql";

const Antidelete = bunql.define("antidelete", {
  session_id: { type: "TEXT", primary: true },
  active: { type: "INTEGER", notNull: true },
  mode: { type: "TEXT" },
});

type AntideleteModes = "all" | "groups" | "p2p";

export const setAntidelete = (
  sessionId: string,
  active: boolean,
  mode: AntideleteModes,
) => {
  const current = Antidelete.query()
    .where("session_id", "=", sessionId)
    .first();
  const activeValue = active ? 1 : 0;

  if (current && current.active === activeValue && current.mode === mode) {
    return null;
  }
  if (current) {
    Antidelete.update({ active: activeValue, mode })
      .where("session_id", "=", sessionId)
      .run();
  } else {
    Antidelete.insert({
      session_id: sessionId,
      active: activeValue,
      mode: mode,
    });
  }

  return { session_id: sessionId, active: activeValue, mode };
};

export const getAntidelete = (sessionId: string) => {
  return Antidelete.query().where("session_id", "=", sessionId).first();
};
