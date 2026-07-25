import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ChallengeDefinition, Runtime } from "../../challenges/_schema";
import type { DebugSessionResponse } from "@/types/session";

/**
 * Choose the tab to open first for a freshly hydrated variant: prefer a
 * playground scratchpad, else the first editable file, else the first known
 * path. Shared by initial session seeding and language switching.
 */
function pickDefaultTab(
    challenge: ChallengeDefinition | null,
    fileState: Record<string, string>,
): string | null {
    const editablePaths =
        challenge?.files.map((f) => f.path) ?? Object.keys(fileState);
    return (
        editablePaths.find(
            (p) => p === "playground.ts" || p.endsWith("/playground.ts"),
        ) ??
        editablePaths[0] ??
        null
    );
}

/** Seed live editor contents from a session, backfilling any files the
 * session's frozen fileState is missing from the challenge's starting set. */
function seedFileContents(
    challenge: ChallengeDefinition | null,
    session: DebugSessionResponse,
): Record<string, string> {
    const seeded: Record<string, string> = { ...session.fileState };
    if (challenge) {
        for (const f of challenge.files) {
            if (seeded[f.path] === undefined) seeded[f.path] = f.content;
        }
    }
    return seeded;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface ArenaState {
    /** Hydrated challenge spec - files, tests, description, hints. */
    challenge: ChallengeDefinition | null;
    /**
     * All language variants of the current challenge, keyed by runtime. Set
     * once on hydration so the language switcher can swap variants without a
     * round-trip for the challenge definition. A single-language challenge has
     * one entry (and no switcher is shown).
     */
    variants: Partial<Record<Runtime, ChallengeDefinition>> | null;
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
    setVariants: (
        variants: Partial<Record<Runtime, ChallengeDefinition>>,
    ) => void;
    setSession: (session: DebugSessionResponse) => void;
    /**
     * Switch the workspace to a different language variant: swap the challenge
     * spec + session together and reseed the editor from scratch (fresh tabs,
     * cleared terminal, reset save state) so no state leaks across languages.
     */
    loadVariant: (
        challenge: ChallengeDefinition,
        session: DebugSessionResponse,
    ) => void;
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
    variants: null,
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

        setVariants: (variants) =>
            set((state) => {
                state.variants = variants;
            }),

        setSession: (session) =>
            set((state) => {
                state.session = session;
                // Seed live editor contents from server state on (re)hydration.
                // Backfill any challenge files missing from this session's saved
                // fileState: a session freezes its fileState at creation, so a
                // file added to the challenge later (e.g. playground.ts) would
                // otherwise show up empty. Fill it from the starting content.
                const seeded = seedFileContents(state.challenge, session);
                state.fileContents = seeded;

                // Pick a default open tab only on a first hydration (no tabs
                // open yet); a language switch goes through loadVariant instead.
                const defaultPath = pickDefaultTab(state.challenge, seeded);
                if (defaultPath && state.openTabs.length === 0) {
                    state.openTabs = [defaultPath];
                    state.activeFile = defaultPath;
                }
            }),

        loadVariant: (challenge, session) =>
            set((state) => {
                state.challenge = challenge;
                state.session = session;

                const seeded = seedFileContents(challenge, session);
                state.fileContents = seeded;

                // Reset the editor wholesale: the previous language's open tabs
                // (e.g. pricing.ts) don't exist in the new variant, so start
                // fresh from that variant's default file.
                const defaultPath = pickDefaultTab(challenge, seeded);
                state.openTabs = defaultPath ? [defaultPath] : [];
                state.activeFile = defaultPath;

                // Clear transient run/save state so nothing leaks across the
                // switch (a stale test badge, a "saved 3s ago" from the old lang).
                state.terminalLines = [];
                state.isRunning = false;
                state.saveStatus = "idle";
                state.saveError = null;
                state.lastSavedAt = null;
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
