import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ChallengeDefinition } from "../../challenges/_schema";
import type { DebugSessionResponse } from "@/types/session";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface ArenaState {
  /** Hydrated challenge spec — files, tests, description, hints. */
  challenge: ChallengeDefinition | null;
  /** Server-issued DebugSession. Null until the session resolves. */
  session: DebugSessionResponse | null;

  /**
   * Live editor contents keyed by path. Diverges from `session.fileState`
   * until autosave flushes. Seeded from the session on hydration.
   */
  fileContents: Record<string, string>;
  /** Path of the file currently focused in the editor. */
  activeFile: string | null;
  /** Open tab paths in display order. */
  openTabs: string[];

  problemPanelOpen: boolean;
  hintPanelOpen: boolean;
  terminalOpen: boolean;

  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;

  // Actions
  setChallenge: (challenge: ChallengeDefinition) => void;
  setSession: (session: DebugSessionResponse) => void;
  setFileContent: (path: string, content: string) => void;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveFile: (path: string) => void;
  toggleProblemPanel: () => void;
  toggleHintPanel: () => void;
  toggleTerminal: () => void;
  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  markSaved: () => void;
  reset: () => void;
}

const initialState = {
  challenge: null,
  session: null,
  fileContents: {},
  activeFile: null,
  openTabs: [],
  problemPanelOpen: true,
  hintPanelOpen: false,
  terminalOpen: true,
  saveStatus: "idle" as SaveStatus,
  saveError: null,
  lastSavedAt: null,
};

export const useArenaStore = create<ArenaState>()(
  immer((set) => ({
    ...initialState,

    setChallenge: (challenge) =>
      set((state) => {
        state.challenge = challenge;
      }),

    setSession: (session) =>
      set((state) => {
        state.session = session;
        // Seed live editor contents from server state on (re)hydration.
        state.fileContents = { ...session.fileState };

        // Pick a sensible default open tab: first editable file from the
        // challenge spec if available, else the first key in fileState.
        const editablePaths =
          state.challenge?.files.map((f) => f.path) ??
          Object.keys(session.fileState);
        const firstPath = editablePaths[0] ?? null;
        if (firstPath && state.openTabs.length === 0) {
          state.openTabs = [firstPath];
          state.activeFile = firstPath;
        }
      }),

    setFileContent: (path, content) =>
      set((state) => {
        state.fileContents[path] = content;
      }),

    openFile: (path) =>
      set((state) => {
        if (!state.openTabs.includes(path)) {
          state.openTabs.push(path);
        }
        state.activeFile = path;
      }),

    closeTab: (path) =>
      set((state) => {
        const idx = state.openTabs.indexOf(path);
        if (idx === -1) return;
        state.openTabs.splice(idx, 1);
        if (state.activeFile === path) {
          // Prefer the tab that took its slot; fall back to the new last tab.
          state.activeFile =
            state.openTabs[idx] ??
            state.openTabs[state.openTabs.length - 1] ??
            null;
        }
      }),

    setActiveFile: (path) =>
      set((state) => {
        state.activeFile = path;
      }),

    toggleProblemPanel: () =>
      set((state) => {
        state.problemPanelOpen = !state.problemPanelOpen;
      }),

    toggleHintPanel: () =>
      set((state) => {
        state.hintPanelOpen = !state.hintPanelOpen;
      }),

    toggleTerminal: () =>
      set((state) => {
        state.terminalOpen = !state.terminalOpen;
      }),

    setSaveStatus: (status, error = null) =>
      set((state) => {
        state.saveStatus = status;
        state.saveError = status === "error" ? error : null;
      }),

    markSaved: () =>
      set((state) => {
        state.saveStatus = "saved";
        state.saveError = null;
        state.lastSavedAt = Date.now();
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, initialState);
      }),
  }))
);
