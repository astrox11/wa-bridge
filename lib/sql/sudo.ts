import { jidNormalizedUser } from "baileys/src";
import { bunql } from "./_sql";

const Sudo = bunql.define("sudo", {
  session_id: { type: "TEXT", notNull: true },
  pn: { type: "TEXT", notNull: true },
  lid: { type: "TEXT" },
});

// Create index for efficient lookups by session
try {
  bunql.exec("CREATE INDEX IF NOT EXISTS idx_sudo_session ON sudo(session_id)");
} catch {
  // Index may already exist
}

export const isSudo = (sessionId: string, id: string) => {
  const rows = Sudo.query().where("session_id", "=", sessionId).get();
  const pn = rows.map((e) => e.pn);
  const lid = rows.map((e) => e.lid);

  return [...pn, ...lid].includes(id);
};

export const addSudo = (sessionId: string, id: string, lid: string) => {
  id = jidNormalizedUser(id);
  lid = jidNormalizedUser(lid);
  if (!isSudo(sessionId, id)) {
    Sudo.insert({ session_id: sessionId, pn: id, lid });
    return true;
  }
  return false;
};

export const removeSudo = (sessionId: string, id: string) => {
  if (isSudo(sessionId, id)) {
    Sudo.delete()
      .where("session_id", "=", sessionId)
      .where("pn", "=", id)
      .orWhere("lid", "=", id)
      .run();
    return true;
  }
  return false;
};

export const getSudos = (sessionId: string) => {
  return Sudo.query().where("session_id", "=", sessionId).get();
};
