import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ChallengeDefinition } from "../../challenges/_schema";
import type { DebugSessionResponse } from "@/types/session";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface ArenaState {
    /** Hydrated challenge spec - files, tests, description, hints. */
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

    /** True while a test run is in flight (stubbed in Phase 4, real in Phase 5). */
    isRunning: boolean;
    /** Append-only buffer of terminal lines from the most recent run. */
    terminalLines: string[];

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
    setTerminalOpen: (open: boolean) => void;
    setSaveStatus: (status: SaveStatus, error?: string | null) => void;
    markSaved: () => void;
    setRunning: (running: boolean) => void;
    appendTerminalLine: (line: string) => void;
    clearTerminal: () => void;
    /**
     * Merge non-fileState fields from a freshly fetched session into the
     * store - used to apply run-result counts without nuking the editor's
     * unsaved buffer.
     */
    mergeSessionMeta: (next: DebugSessionResponse) => void;
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
    isRunning: false,
    terminalLines: [] as string[],
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
                const seeded: Record<string, string> = { ...session.fileState };
                // Backfill any challenge files missing from this session's saved
                // fileState. A session freezes its fileState at creation, so a
                // file added to the challenge later (e.g. playground.ts) would
                // otherwise show up empty. Fill it from the starting content.
                if (state.challenge) {
                    for (const f of state.challenge.files) {
                        if (seeded[f.path] === undefined) {
                            seeded[f.path] = f.content;
                        }
                    }
                }
                state.fileContents = seeded;

                // Pick a default open tab: prefer the playground scratchpad when
                // present, else the first editable file, else the first fileState
                // key.
                const editablePaths =
                    state.challenge?.files.map((f) => f.path) ??
                    Object.keys(seeded);
                const defaultPath =
                    editablePaths.find(
                        (p) => p === "playground.ts" || p.endsWith("/playground.ts"),
                    ) ??
                    editablePaths[0] ??
                    null;
                if (defaultPath && state.openTabs.length === 0) {
                    state.openTabs = [defaultPath];
                    state.activeFile = defaultPath;
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

        setTerminalOpen: (open) =>
            set((state) => {
                state.terminalOpen = open;
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

        setRunning: (running) =>
            set((state) => {
                state.isRunning = running;
            }),

        appendTerminalLine: (line) =>
            set((state) => {
                state.terminalLines.push(line);
            }),

        clearTerminal: () =>
            set((state) => {
                state.terminalLines = [];
            }),

        mergeSessionMeta: (next) =>
            set((state) => {
                if (!state.session) {
                    state.session = next;
                    return;
                }
                // Preserve the existing in-memory fileState (user edits in flight)
                // and overwrite everything else.
                state.session = { ...next, fileState: state.session.fileState };
            }),

        reset: () =>
            set((state) => {
                Object.assign(state, initialState);
            }),
    })),
);
