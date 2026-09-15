import type { BlockType } from "@/lib/types";
import type { BlockComponent } from "./types";
import { TechniqueBlock } from "./technique";
import { TimingBlock } from "./timing";
import { ReadingBlock } from "./reading";
import { HarmonyBlock } from "./harmony";
import { PiecesBlock } from "./pieces";
import { OwnBlock } from "./own";

export * from "./types";

export const BLOCK_COMPONENTS: Record<BlockType, BlockComponent> = {
  scales: TechniqueBlock,
  rhythm: TimingBlock,
  reading: ReadingBlock,
  theory: HarmonyBlock,
  repertoire: PiecesBlock,
  improv: OwnBlock,
};
