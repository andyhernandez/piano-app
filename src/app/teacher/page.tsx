"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/ds";
import { TeacherScreen } from "@/components/screens/teacher/teacher-screen";

function TeacherWithCode() {
  const params = useSearchParams();
  const code = params.get("code");
  return <TeacherScreen code={code ? code.toUpperCase() : null} />;
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<Screen>{null}</Screen>}>
      <TeacherWithCode />
    </Suspense>
  );
}
