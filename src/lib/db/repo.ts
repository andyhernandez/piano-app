import type { Assignment, AssessmentResult, Child, Parent, Recording, Session, Song, Teacher } from "../types";
import { db } from "./schema";

async function enqueue(table: string, op: "put" | "delete", key: string, payload: unknown) {
  // Recordings are binary and large; they sync separately when a provider is configured.
  if (table === "recordings") return;
  await db().syncOutbox.add({ table, op, key, payload, createdAt: new Date().toISOString() });
}

export const repo = {
  // ---- parents ----
  async getParent(id: string) { return db().parents.get(id); },
  async firstParent() { return db().parents.toCollection().first(); },
  async putParent(p: Parent) { await db().parents.put(p); await enqueue("parents", "put", p.id, p); },

  // ---- children ----
  async getChild(id: string) { return db().children.get(id); },
  async listChildren(parentId?: string) {
    return parentId ? db().children.where("parentId").equals(parentId).toArray() : db().children.toArray();
  },
  async putChild(c: Child) { await db().children.put(c); await enqueue("children", "put", c.id, c); },
  async deleteChild(id: string) {
    await db().transaction("rw", [db().children, db().sessions, db().recordings, db().assessments, db().assignments], async () => {
      await db().children.delete(id);
      await db().sessions.where("childId").equals(id).delete();
      await db().recordings.where("childId").equals(id).delete();
      await db().assessments.where("childId").equals(id).delete();
      await db().assignments.where("childId").equals(id).delete();
    });
    await enqueue("children", "delete", id, null);
  },

  // ---- sessions ----
  async getSession(id: string) { return db().sessions.get(id); },
  async putSession(s: Session) { await db().sessions.put(s); await enqueue("sessions", "put", s.id, s); },
  async listSessions(childId: string, limit = 60) {
    return db().sessions.where("childId").equals(childId).reverse().sortBy("startedAt").then((a) => a.slice(0, limit));
  },
  async sessionsOn(childId: string, date: string) {
    return db().sessions.where("[childId+date]").equals([childId, date]).toArray();
  },
  async sessionsBetween(childId: string, from: string, to: string) {
    return db().sessions.where("[childId+date]").between([childId, from], [childId, to], true, true).toArray();
  },

  // ---- recordings ----
  async putRecording(r: Recording) { await db().recordings.put(r); },
  async getRecording(id: string) { return db().recordings.get(id); },
  async listRecordings(childId: string) { return db().recordings.where("childId").equals(childId).reverse().sortBy("createdAt"); },
  async deleteRecording(id: string) { await db().recordings.delete(id); },

  // ---- assessments ----
  async putAssessment(a: AssessmentResult) { await db().assessments.put(a); await enqueue("assessments", "put", a.id, a); },
  async listAssessments(childId: string) { return db().assessments.where("childId").equals(childId).sortBy("takenAt"); },

  // ---- teachers & assignments ----
  async putTeacher(t: Teacher) { await db().teachers.put(t); await enqueue("teachers", "put", t.id, t); },
  async teacherByCode(code: string) { return db().teachers.where("inviteCode").equals(code.toUpperCase()).first(); },
  async listTeachers() { return db().teachers.toArray(); },
  async putAssignment(a: Assignment) { await db().assignments.put(a); await enqueue("assignments", "put", a.id, a); },
  async assignmentFor(childId: string) { return db().assignments.where("childId").equals(childId).first(); },

  // ---- custom songs ----
  async putCustomSong(s: Song) { await db().customSongs.put(s); await enqueue("customSongs", "put", s.id, s); },
  async listCustomSongs() { return db().customSongs.toArray(); },
  async deleteCustomSong(id: string) { await db().customSongs.delete(id); await enqueue("customSongs", "delete", id, null); },

  // ---- kv ----
  async getKV<T>(key: string): Promise<T | undefined> { const row = await db().kv.get(key); return row?.value as T | undefined; },
  async setKV(key: string, value: unknown) { await db().kv.put({ key, value }); },

  // ---- sync outbox ----
  async pendingOps(limit = 200) { return db().syncOutbox.orderBy("createdAt").limit(limit).toArray(); },
  async clearOps(ids: number[]) { await db().syncOutbox.bulkDelete(ids); },
  async outboxCount() { return db().syncOutbox.count(); },

  /** Wipe everything (parent-only action in settings). */
  async nuke() { await db().delete(); await db().open(); },
};
