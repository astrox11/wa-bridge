import { bunql } from "./_sql";

const Antidelete = bunql.define("antidelete", {
  active: { type: "INTEGER", primary: true },
  mode: { type: "TEXT" },
});

type AntideleteModes = "all" | "groups" | "p2p";

export const setAntidelete = (active: boolean, mode: AntideleteModes) => {
  const current = Antidelete.all()[0];
  const activeValue = active ? 1 : 0;

  if (current && current.active === activeValue && current.mode === mode) {
    return null;
  }
  if (current) {
    Antidelete.delete().where("active", "=", current.active);
  }

  return Antidelete.insert({
    active: activeValue,
    mode: mode,
  });
};

export const getAntidelete = () => {
  return Antidelete.all()[0];
};
