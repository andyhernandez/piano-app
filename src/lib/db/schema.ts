import Dexie, { type EntityTable } from "dexie";
import type { Assignment, AssessmentResult, Child, Parent, Recording, Session, Song, Teacher } from "../types";

/** Key/value bag for app-level settings (active child, last route, etc.). */
export interface KV {
  key: string;
  value: unknown;
}

/** Outbox row for cloud sync; local-first writes enqueue here (§2 persistence). */
export interface SyncOp {
  id?: number;
  table: string;
  op: "put" | "delete";
  key: string;
  payload: unknown;
  createdAt: string;
}

export class KeyCadenceDB extends Dexie {
  parents!: EntityTable<Parent, "id">;
  children!: EntityTable<Child, "id">;
  sessions!: EntityTable<Session, "id">;
  recordings!: EntityTable<Recording, "id">;
  assessments!: EntityTable<AssessmentResult, "id">;
  assignments!: EntityTable<Assignment, "id">;
  teachers!: EntityTable<Teacher, "id">;
  customSongs!: EntityTable<Song, "id">;
  kv!: EntityTable<KV, "key">;
  syncOutbox!: EntityTable<SyncOp, "id">;

  constructor(name = "keycadence") {
    super(name);
    this.version(1).stores({
      parents: "id",
      children: "id, parentId",
      sessions: "id, childId, date, [childId+date]",
      recordings: "id, childId, sessionId, [childId+blockType]",
      assessments: "id, childId, takenAt",
      assignments: "id, childId, teacherId",
      teachers: "id, inviteCode",
      customSongs: "id, unlockedByRegion",
      kv: "key",
      syncOutbox: "++id, table, createdAt",
    });
  }
}

let _db: KeyCadenceDB | null = null;

export function db(): KeyCadenceDB {
  if (!_db) _db = new KeyCadenceDB();
  return _db;
}

/** Test helper: swap in a fresh DB (used with fake-indexeddb). */
export function resetDbForTests(name = `keycadence-test-${Math.random().toString(36).slice(2)}`) {
  _db = new KeyCadenceDB(name);
  return _db;
}
