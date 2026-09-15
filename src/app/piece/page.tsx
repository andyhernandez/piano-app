"use client";
import { Suspense } from "react";
import { Screen } from "@/components/ds";
import { PieceScreen } from "@/components/screens/piece/piece-screen";

export default function PiecePage() {
  return (
    <Suspense fallback={<Screen>{null}</Screen>}>
      <PieceScreen />
    </Suspense>
  );
}
