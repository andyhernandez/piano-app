import type { BlockResult, BlockType, Child, InputMode, Scale, Session } from "@/lib/types";
import type { SessionPlan } from "@/lib/store/app-store";

/**
 * Contract between the session runner (`src/components/screens/session/*`) and the six practice blocks.
 * A block renders ONLY the main area under the runner's block header and progress strip; the runner owns
 * the 56px BlockHeader, the ProgressStrip, the clock, Pause, the input-lost overlay and the hard stop.
 */
export interface BlockProps {
  child: Child;
  session: Session;
  plan: SessionPlan;
  scale: Scale;
  /** 1-based position and count in today's queue, for copy like "Next — harmony". */
  index: number;
  total: number;
  /** Seconds planned for this block. */
  seconds: number;
  /** Seconds elapsed in this block (runner clock). */
  elapsed: number;
  /** True when the runner's clock has reached `seconds`; blocks should surface "Next" prominently. */
  timeUp: boolean;
  paused: boolean;
  inputMode: InputMode;
  /** Title of the next block, e.g. "harmony", or null when this is the last block. */
  nextTitle: string | null;
  /** Hand the result back; the runner persists it and moves on. */
  onDone: (result: Omit<BlockResult, "type" | "plannedSec" | "durationSec">) => void;
  /** Skip the block (recorded as skipped). */
  onSkip: () => void;
  /** Ask the runner to show/hide its own action buttons; blocks that draw their own bottom bar pass false. */
  setPrimaryLabel?: (label: string | null) => void;
  /** Replace the header meta ("G major · two octaves · hands separately · 𝅘𝅥76"); null restores the runner's default. */
  setMeta?: (meta: React.ReactNode | null) => void;
  /** Tell the runner a recording is running so it shows the REC pill in the header. */
  setRecording?: (on: boolean) => void;
}

export type BlockComponent = (props: BlockProps) => React.ReactNode;

export interface BlockMeta {
  type: BlockType;
  /** Header title in sentence case: "Technique", "Timing", "Sight reading", "Harmony", "Pieces", "Your own". */
  title: string;
}
