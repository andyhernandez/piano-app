"use client";
import { create } from "zustand";
import type { AssessmentResult, Assignment, BlockResult, BlockType, BlockWeights, Child, ChildSettings, InputMode, Parent, ScaleId, Session, SkillProfile } from "../types";
import { repo } from "../db/repo";
import { newId } from "../utils/id";
import { dateKey, weekDays, weekKey } from "../utils/date";
import { deriveWeights, blockDurations, normalize } from "../engine/weights";
import { emptyStreak, recordPractice, reconcile, grantFreeze } from "../engine/streak";
import { XP_PER_BLOCK, XP_SESSION_BONUS, XP_ASSESSMENT_RETAKE, companionLevel } from "../engine/xp";
import { currentScale, initialMapProgress, awardBadge, hasBadge, spendKeyAndAdvance } from "../engine/progression";
import { DEFAULT_ROADMAP } from "../music/roadmap";
import { starsFor } from "../engine/scoring";
import { orderedBlocks } from "../engine/queue";
import { configureSync, syncNow } from "../sync/engine";

export interface SessionPlan {
  blockSeconds: Record<BlockType, number>;
  weights: BlockWeights;
  scale: ScaleId;
  minutes: number;
}

interface AppState {
  booted: boolean;
  parent: Parent | null;
  children: Child[];
  activeChildId: string | null;
  activeSession: Session | null;
  plan: SessionPlan | null;
  inputMode: InputMode;
  parentUnlocked: boolean;

  boot(): Promise<void>;
  refreshChildren(): Promise<void>;
  createParent(pin: string | null): Promise<Parent>;
  createChild(input: { name: string; avatar?: string; companion?: Child["companion"]; ageBand?: Child["ageBand"]; blurb?: string; settings?: Partial<ChildSettings> }): Promise<Child>;
  setActiveChild(id: string | null): Promise<void>;
  updateChild(id: string, patch: Partial<Child> | ((c: Child) => Child)): Promise<Child | null>;
  updateSettings(id: string, patch: Partial<ChildSettings>): Promise<void>;
  updateParent(patch: Partial<Parent>): Promise<void>;
  setParentUnlocked(v: boolean): void;
  setInputMode(m: InputMode): void;

  saveAssessment(childId: string, result: Omit<AssessmentResult, "id" | "childId" | "takenAt">): Promise<SkillProfile>;

  /** Plan today's session. A linked teacher's assignment, when passed, pins the key and the block weights. */
  planSession(child: Child, assignment?: Assignment | null): SessionPlan;
  startSession(child: Child, inputMode: InputMode, teacherNote?: string, assignment?: Assignment | null): Promise<Session>;
  recordBlock(result: BlockResult): Promise<void>;
  finishSession(): Promise<{ session: Session; child: Child } | null>;
  abandonSession(): Promise<void>;

  spendKey(): Promise<void>;
  grantFreezeToActive(): Promise<void>;
}

export function defaultSettings(): ChildSettings {
  return {
    sessionMinutes: 20,
    practiceDaysPerWeek: 5,
    weightsOverride: null,
    quietHours: null,
    inputModePreference: "auto",
    micCalibration: null,
    readingLevel: 1,
    rhythmLevel: 1,
    theoryLevel: 1,
    noStopStreak: 0,
    sightReadingFactoryLink: null,
    mode: "guided",
    hardStop: true,
    restDays: [2, 6],
    countIn: true,
    pinnedSongIds: [],
  };
}

export const DEFAULT_TEACHER_SHARE = { log: true, figures: true, recordings: true, skillChecks: false };

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  parent: null,
  children: [],
  activeChildId: null,
  activeSession: null,
  plan: null,
  inputMode: "timer",
  parentUnlocked: false,

  async boot() {
    const parent = (await repo.firstParent()) ?? null;
    const children = parent ? await repo.listChildren(parent.id) : [];
    const activeChildId = (await repo.getKV<string>("activeChildId")) ?? children[0]?.id ?? null;
    // Reconcile streaks with the calendar on boot, and fill in fields older records lack.
    const today = dateKey();
    for (const c of children) {
      let dirty = false;
      const reconciled = reconcile(c.streak, today);
      if (JSON.stringify(reconciled) !== JSON.stringify(c.streak)) { c.streak = reconciled; dirty = true; }
      const settings = { ...defaultSettings(), ...c.settings };
      if (JSON.stringify(settings) !== JSON.stringify(c.settings)) { c.settings = settings; dirty = true; }
      if (!c.teacherShare) { c.teacherShare = { ...DEFAULT_TEACHER_SHARE }; dirty = true; }
      if (dirty) await repo.putChild(c);
    }
    if (parent && !parent.codeFor) { parent.codeFor = { settings: true, teacherLink: true, deleteRecording: true }; await repo.putParent(parent); }
    configureSync(parent);
    // A session started today and never ended (the tab closed mid-block) resumes at its next unfinished block.
    let activeSession: Session | null = null;
    let plan: SessionPlan | null = null;
    if (activeChildId) {
      const open = (await repo.sessionsOn(activeChildId, today)).find((s) => !s.endedAt) ?? null;
      if (open) {
        activeSession = open;
        plan = { blockSeconds: blockDurations(open.weights, open.plannedMinutes), weights: open.weights, scale: open.scale, minutes: open.plannedMinutes };
      }
    }
    set({ booted: true, parent, children, activeChildId, activeSession, plan, inputMode: activeSession?.inputMode ?? "timer" });
    void syncNow();
  },

  async refreshChildren() {
    const { parent } = get();
    const children = parent ? await repo.listChildren(parent.id) : [];
    set({ children });
  },

  async createParent(pin) {
    const parent: Parent = { id: newId("par"), email: null, pin, childIds: [], createdAt: new Date().toISOString(), weeklyDigest: false, sync: null };
    await repo.putParent(parent);
    set({ parent, parentUnlocked: true });
    return parent;
  },

  async createChild({ name, avatar, companion, ageBand, blurb, settings }) {
    let { parent } = get();
    if (!parent) parent = await get().createParent(null);
    const child: Child = {
      id: newId("kid"),
      parentId: parent.id,
      name,
      avatar: avatar ?? name.slice(0, 1).toUpperCase(),
      companion: companion ?? { species: "note-sprite", name: "", level: 1, outfit: "default" },
      ageBand,
      blurb,
      teacherShare: { ...DEFAULT_TEACHER_SHARE },
      skillProfile: null,
      xp: 0,
      stars: 0,
      keys: 0,
      streak: emptyStreak(),
      roadmapIndex: 0,
      scaleOverride: null,
      roadmap: DEFAULT_ROADMAP,
      mapProgress: initialMapProgress(DEFAULT_ROADMAP),
      unlocks: { songs: [], outfits: ["default"], mapThemes: ["parchment"], grooves: ["pop"], keyboardSkins: ["classic"], badges: [] },
      settings: { ...defaultSettings(), ...(settings ?? {}) },
      createdAt: new Date().toISOString(),
      completedWeeks: [],
      weeklyChallenges: {},
    };
    await repo.putChild(child);
    const updatedParent = { ...parent, childIds: [...parent.childIds, child.id] };
    await repo.putParent(updatedParent);
    await repo.setKV("activeChildId", child.id);
    set((s) => ({ parent: updatedParent, children: [...s.children, child], activeChildId: child.id }));
    return child;
  },

  async setActiveChild(id) {
    await repo.setKV("activeChildId", id);
    set({ activeChildId: id, activeSession: null, plan: null });
  },

  async updateChild(id, patch) {
    const current = get().children.find((c) => c.id === id) ?? (await repo.getChild(id));
    if (!current) return null;
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    await repo.putChild(next);
    set((s) => ({ children: s.children.map((c) => (c.id === id ? next : c)) }));
    return next;
  },

  async updateSettings(id, patch) {
    await get().updateChild(id, (c) => ({ ...c, settings: { ...c.settings, ...patch } }));
  },

  async updateParent(patch) {
    const { parent } = get();
    if (!parent) return;
    const next = { ...parent, ...patch };
    await repo.putParent(next);
    configureSync(next);
    set({ parent: next });
  },

  setParentUnlocked(v) { set({ parentUnlocked: v }); },
  setInputMode(m) { set({ inputMode: m }); },

  async saveAssessment(childId, result) {
    const takenAt = new Date().toISOString();
    const row: AssessmentResult = { id: newId("asm"), childId, takenAt, ...result };
    await repo.putAssessment(row);
    const profile: SkillProfile = { ear: result.echo, eye: result.flash, pulse: result.pulse, assessedAt: takenAt };
    const child = get().children.find((c) => c.id === childId);
    const retake = !!child?.skillProfile;
    await get().updateChild(childId, (c) => {
      let next: Child = { ...c, skillProfile: profile, xp: c.xp + (retake ? XP_ASSESSMENT_RETAKE : 0) };
      if (!hasBadge(next, "assessment-complete")) next = awardBadge(next, "assessment-complete");
      return next;
    });
    return profile;
  },

  planSession(child, assignment) {
    const override = assignment?.weightsOverride ?? child.settings.weightsOverride;
    const weights = override ? normalize(override) : deriveWeights(child.skillProfile);
    const minutes = child.settings.sessionMinutes;
    const scale = assignment?.scaleOverride ?? currentScale(child);
    return { blockSeconds: blockDurations(weights, minutes), weights, scale, minutes };
  },

  async startSession(child, inputMode, teacherNote, assignment) {
    const plan = get().planSession(child, assignment);
    const session: Session = {
      id: newId("ses"),
      childId: child.id,
      date: dateKey(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      scale: plan.scale,
      weights: plan.weights,
      plannedMinutes: plan.minutes,
      inputMode,
      blocks: [],
      durationSec: 0,
      completed: false,
      xpEarned: 0,
      starsEarned: 0,
      teacherNote,
      mode: child.settings.mode,
    };
    await repo.putSession(session);
    set({ activeSession: session, plan, inputMode });
    return session;
  },

  async recordBlock(result) {
    const { activeSession } = get();
    if (!activeSession) return;
    const same = (b: BlockResult) => (result.slot !== undefined && b.slot !== undefined ? b.slot === result.slot : b.type === result.type);
    const blocks = [...activeSession.blocks.filter((b) => !same(b)), result];
    const xp = result.completed ? XP_PER_BLOCK : 0;
    const stars = starsFor(result.midiScore);
    const session: Session = {
      ...activeSession,
      blocks,
      durationSec: blocks.reduce((s, b) => s + b.durationSec, 0),
      xpEarned: activeSession.xpEarned + xp,
      starsEarned: activeSession.starsEarned + stars,
    };
    await repo.putSession(session);
    set({ activeSession: session });
    if (result.completed) {
      // Apply XP and any badge immediately so the companion reacts.
      await get().updateChild(activeSession.childId, (c) => {
        let next: Child = { ...c, xp: c.xp + xp, stars: c.stars + stars };
        if (result.midiScore?.badge) next = awardBadge(next, result.midiScore.badge, session.id);
        return next;
      });
    }
  },

  async finishSession() {
    const { activeSession } = get();
    if (!activeSession) return null;
    const child = get().children.find((c) => c.id === activeSession.childId);
    if (!child) return null;
    const order = orderedBlocks(child);
    const settled = (i: number, t: BlockType) => activeSession.blocks.some((r) => (r.slot !== undefined ? r.slot === i : r.type === t) && (r.completed || r.skipped));
    const allDone = order.every((t, i) => settled(i, t));
    const completedCount = activeSession.blocks.filter((b) => b.completed).length;
    const completed = allDone && completedCount >= Math.min(4, order.length); // finishing counts if most blocks were done
    const bonus = completed ? XP_SESSION_BONUS : 0;
    const session: Session = { ...activeSession, endedAt: new Date().toISOString(), completed, xpEarned: activeSession.xpEarned + bonus };
    await repo.putSession(session);

    const today = session.date;
    const updated = await get().updateChild(child.id, (c) => {
      let next: Child = { ...c, xp: c.xp + bonus };
      if (completed) {
        const r = recordPractice(c.streak, today);
        next.streak = r.streak;
        if (!hasBadge(next, "first-session")) next = awardBadge(next, "first-session", session.id);
        next.companion = { ...next.companion, level: companionLevel(next.xp) };
      }
      return next;
    });
    if (!updated) return null;

    // Weekly key: sessions completed on >= practiceDaysPerWeek distinct days this week.
    if (completed) {
      const wk = weekKey(today);
      if (!updated.completedWeeks.includes(wk)) {
        const days = weekDays(today);
        const sessions = await repo.sessionsBetween(child.id, days[0], days[6]);
        const distinct = new Set(sessions.filter((s) => s.completed).map((s) => s.date));
        if (distinct.size >= updated.settings.practiceDaysPerWeek) {
          await get().updateChild(child.id, (c) => {
            let next: Child = { ...c, keys: c.keys + 1, completedWeeks: [...c.completedWeeks, wk] };
            next = awardBadge(next, "week-complete", session.id);
            return next;
          });
        }
      }
    }

    const finalChild = get().children.find((c) => c.id === child.id) ?? updated;
    if (completed) {
    }

    set({ activeSession: null, plan: null });
    void syncNow();
    return { session, child: finalChild };
  },

  async abandonSession() {
    const { activeSession } = get();
    if (activeSession) {
      const session = { ...activeSession, endedAt: new Date().toISOString(), completed: false };
      await repo.putSession(session);
    }
    set({ activeSession: null, plan: null });
  },

  async spendKey() {
    const { activeChildId, children } = get();
    const child = children.find((c) => c.id === activeChildId);
    if (!child || child.keys <= 0) return;
    const { child: next } = spendKeyAndAdvance(child);
    await repo.putChild(next);
    set((s) => ({ children: s.children.map((c) => (c.id === next.id ? next : c)) }));
  },

  async grantFreezeToActive() {
    const { activeChildId } = get();
    if (!activeChildId) return;
    await get().updateChild(activeChildId, (c) => ({ ...c, streak: grantFreeze(c.streak) }));
  },

}));

/** Convenience selector for the active child. */
export function useActiveChild(): Child | null {
  return useAppStore((s) => s.children.find((c) => c.id === s.activeChildId) ?? null);
}
