"use client";
import * as React from "react";
import { repo } from "@/lib/db/repo";
import type { Assignment, Session, Teacher } from "@/lib/types";

export interface ProfileData {
  sessions: Session[];
  assignment: Assignment | null;
  teacher: Teacher | null;
  loaded: boolean;
}

/** Sessions, the linked teacher's assignment and the teacher record for a profile. Reloads when `version` changes. */
export function useProfileData(childId: string | null, version = 0): ProfileData {
  const [data, setData] = React.useState<ProfileData>({ sessions: [], assignment: null, teacher: null, loaded: false });
  React.useEffect(() => {
    let cancelled = false;
    if (!childId) return;
    (async () => {
      const [sessions, assignment] = await Promise.all([repo.listSessions(childId, 120), repo.assignmentFor(childId)]);
      let teacher: Teacher | null = null;
      if (assignment) {
        const teachers = await repo.listTeachers();
        teacher = teachers.find((t) => t.id === assignment.teacherId) ?? null;
      }
      if (!cancelled) setData({ sessions, assignment: assignment ?? null, teacher, loaded: true });
    })();
    return () => { cancelled = true; };
  }, [childId, version]);
  return data;
}
