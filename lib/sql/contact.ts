import type { GroupParticipant } from "baileys";
import { bunql } from "./_sql";

const Contact = bunql.define("contacts", {
  pn: { type: "TEXT", primary: true },
  lid: { type: "TEXT" },
});

export const addContact = (pn: string, lid: string) => {
  pn = pn.split("@")[0];
  lid = lid.split("@")[0];
  return Contact.upsert({ pn, lid });
};

export const getLidByPn = async (pn: string) => {
  const contact = Contact.find({ pn })[0];
  return contact?.lid + "@lid" || null;
};

export const getPnByLid = (lid: string) => {
  const contact = Contact.query().where("lid", "=", lid).first();
  return contact?.pn + "@s.whatsapp.net" || null;
};

export const getAlternateId = (id: string) => {
  const contact = Contact.query()
    .where("pn", "=", id)
    .orWhere("lid", "=", id)
    .first();
  if (!contact) return null;
  return contact.pn === id
    ? contact.lid + "@lid"
    : contact.pn + "@s.whatsapp.net";
};

export const removeContact = (id: string) => {
  return Contact.delete().where("pn", "=", id).orWhere("lid", "=", id).run();
};

export const syncGroupParticipantsToContactList = (
  participants: GroupParticipant[],
) => {
  for (const participant of participants) {
    addContact(participant.phoneNumber, participant.id);
  }
};
