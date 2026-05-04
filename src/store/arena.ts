import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  ChallengeDefinition,
  HintLevelNumber,
} from "@/types/challenge";
import type { DebugSessionResponse } from "@/types/session";

export type TestStatus =
  | "idle"
  | "running"
  | "passed"
  | "failed"
  | "timeout"
  | "error";

export interface TestOutputLine {
  kind: "stdout" | "stderr" | "system";
  text: string;
  timestamp: number;
}

export interface RunStats {
  pass: number;
  fail: number;
  duration: number;
}

/** A hint as held in the store. content === null means locked / not yet revealed. */
export interface ArenaHint {
  level: HintLevelNumber;
  title: string;
  penaltyPoints: number;
  content: string | null;
}

export interface LockedHint {
  level: HintLevelNumber;
  title: string;
  penaltyPoints: number;
}

export interface ArenaState {
  // identity
  sessionId: string | null;
  challenge: ChallengeDefinition | null;

  // editor
  files: Record<string, string>;
  originalFiles: Record<string, string>;
  openTabs: string[];
  activeTab: string | null;
  /** Object-as-set: keys are paths whose current content differs from originalFiles[path]. */
  dirtyFiles: Record<string, true>;

  // tests
  testOutput: TestOutputLine[];
  testStatus: TestStatus;
  lastRunStats: RunStats | null;

  // hints
  hints: ArenaHint[];

  // actions
  initialize: (args: {
    challenge: ChallengeDefinition;
    session: DebugSessionResponse;
  }) => void;
  reset: () => void;

  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string | null) => void;
  setFileContent: (path: string, content: string) => void;
  markAllSaved: () => void;
  /**
   * Clear dirty marks for paths whose current content still equals the snapshot.
   * Use this after a successful autosave PATCH — paths the user re-edited
   * during the save are correctly left dirty so the next save catches them.
   */
  markSavedSnapshot: (snapshot: Record<string, string>) => void;

  appendTestOutput: (line: TestOutputLine) => void;
  clearTestOutput: () => void;
  setTestStatus: (status: TestStatus, stats?: RunStats | null) => void;

  setLockedHints: (hints: LockedHint[]) => void;
  revealHint: (level: HintLevelNumber, content: string) => void;
}

export const useArenaStore = create<ArenaState>()(
  immer((set) => ({
    sessionId: null,
    challenge: null,
    files: {},
    originalFiles: {},
    openTabs: [],
    activeTab: null,
    dirtyFiles: {},
    testOutput: [],
    testStatus: "idle",
    lastRunStats: null,
    hints: [],

    initialize({ challenge, session }) {
      set((s) => {
        s.sessionId = session.id;
        s.challenge = challenge;
        s.files = { ...session.fileState };
        s.originalFiles = Object.fromEntries(
          challenge.files.map((f) => [f.path, f.content])
        );
        // Recompute dirty marks against the seeded original (resume case).
        s.dirtyFiles = {};
        for (const [path, content] of Object.entries(s.files)) {
          if (s.originalFiles[path] !== content) s.dirtyFiles[path] = true;
        }
        const firstEditable = challenge.files[0]?.path ?? null;
        s.openTabs = firstEditable ? [firstEditable] : [];
        s.activeTab = firstEditable;
        s.testOutput = [];
        s.testStatus = "idle";
        s.lastRunStats = null;
        // Hints arrive locked via setLockedHints from the challenge def.
        s.hints = [];
      });
    },

    reset() {
      set((s) => {
        s.sessionId = null;
        s.challenge = null;
        s.files = {};
        s.originalFiles = {};
        s.openTabs = [];
        s.activeTab = null;
        s.dirtyFiles = {};
        s.testOutput = [];
        s.testStatus = "idle";
        s.lastRunStats = null;
        s.hints = [];
      });
    },

    openFile(path) {
      set((s) => {
        if (!s.openTabs.includes(path)) s.openTabs.push(path);
        s.activeTab = path;
      });
    },

    closeTab(path) {
      set((s) => {
        const idx = s.openTabs.indexOf(path);
        if (idx === -1) return;
        s.openTabs.splice(idx, 1);
        if (s.activeTab === path) {
          // Prefer the tab to the right, then to the left, else null.
          s.activeTab = s.openTabs[idx] ?? s.openTabs[idx - 1] ?? null;
        }
      });
    },

    setActiveTab(path) {
      set((s) => {
        s.activeTab = path;
      });
    },

    setFileContent(path, content) {
      set((s) => {
        if (s.files[path] === content) return;
        s.files[path] = content;
        if (s.originalFiles[path] !== content) {
          s.dirtyFiles[path] = true;
        } else {
          delete s.dirtyFiles[path];
        }
      });
    },

    markAllSaved() {
      set((s) => {
        s.dirtyFiles = {};
      });
    },

    markSavedSnapshot(snapshot) {
      set((s) => {
        for (const [path, content] of Object.entries(snapshot)) {
          if (s.files[path] === content) delete s.dirtyFiles[path];
        }
      });
    },

    appendTestOutput(line) {
      set((s) => {
        s.testOutput.push(line);
      });
    },

    clearTestOutput() {
      set((s) => {
        s.testOutput = [];
      });
    },

    setTestStatus(status, stats) {
      set((s) => {
        s.testStatus = status;
        if (stats !== undefined) s.lastRunStats = stats;
      });
    },

    setLockedHints(locked) {
      set((s) => {
        s.hints = locked.map((h) => ({ ...h, content: null }));
      });
    },

    revealHint(level, content) {
      set((s) => {
        const h = s.hints.find((x) => x.level === level);
        if (h) h.content = content;
      });
    },
  }))
);

// ----- selectors -----

export const selectIsDirty =
  (path: string) =>
  (s: ArenaState): boolean =>
    !!s.dirtyFiles[path];

export const selectHasUnsavedChanges = (s: ArenaState): boolean =>
  Object.keys(s.dirtyFiles).length > 0;

export const selectHintsRevealedCount = (s: ArenaState): number =>
  s.hints.filter((h) => h.content !== null).length;
