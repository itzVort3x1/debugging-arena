# Debugging Arena — MVP Implementation Plan

## Context

Build "Debugging Arena" from scratch — a platform where developers practice debugging broken codebases instead of solving algorithm puzzles. The directory `D:\Debugging Arena` is completely empty. The full product spec was provided by the user. This plan covers MVP implementation only: 3 sample challenges, browser IDE, test runner, AI hints, scoring, and postmortems.

---

## Architecture

**Single Next.js 14 (App Router) application** — no monorepo. API routes collocated with frontend. Test runner runs as a Node.js child_process (no Docker). File-based challenge definitions are the source of truth.

---

## Directory Structure

```
D:\Debugging Arena\
├── .env.local                          # DB URL, NextAuth secret, Anthropic key
├── .env.example
├── next.config.ts                      # Monaco webpack plugin config
├── tailwind.config.ts                  # VSCode dark theme tokens
├── tsconfig.json
├── package.json
├── prisma/
│   └── schema.prisma
├── challenges/                         # File-based challenge definitions
│   ├── _schema.ts                      # TypeScript types for ChallengeDefinition
│   ├── duplicate-chat-messages/
│   │   ├── meta.json
│   │   ├── description.md
│   │   ├── files/                      # Broken source files (editable by user)
│   │   ├── tests/challenge.test.ts     # Read-only test file
│   │   └── hints.json                  # 4-level progressive hints
│   ├── memory-leak/
│   └── payment-retry-bug/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                    # Landing: challenge list
    │   ├── (auth)/login/page.tsx
    │   ├── (auth)/register/page.tsx
    │   ├── challenges/[slug]/page.tsx  # Challenge detail
    │   ├── challenges/[slug]/arena/page.tsx   # THE IDE
    │   ├── dashboard/page.tsx
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── challenges/route.ts
    │       ├── challenges/[slug]/route.ts
    │       ├── sessions/route.ts
    │       ├── sessions/[sessionId]/route.ts
    │       ├── sessions/[sessionId]/run-tests/route.ts   # SSE
    │       ├── sessions/[sessionId]/hint/route.ts
    │       ├── sessions/[sessionId]/submit/route.ts
    │       └── postmortem/[sessionId]/route.ts           # SSE
    ├── components/
    │   ├── ide/
    │   │   ├── ArenaLayout.tsx         # Root IDE: assembles all panels
    │   │   ├── FileExplorer.tsx        # Left sidebar file tree
    │   │   ├── TabBar.tsx              # Open file tabs, dirty dot
    │   │   ├── CodeEditor.tsx          # Monaco wrapper (dynamic import, ssr:false)
    │   │   ├── TerminalPanel.tsx       # Jest output with ANSI colors
    │   │   ├── ProblemPanel.tsx        # description.md rendered
    │   │   ├── HintPanel.tsx           # Progressive hint reveal
    │   │   ├── StatusBar.tsx           # File, cursor, test status
    │   │   ├── TopBar.tsx              # Logo, timer, submit button
    │   │   └── RunButton.tsx
    │   ├── challenge/
    │   │   ├── ChallengeCard.tsx
    │   │   └── DifficultyBadge.tsx
    │   ├── postmortem/PostmortemReport.tsx
    │   └── ui/Button.tsx, Badge.tsx, Spinner.tsx, MarkdownRenderer.tsx
    ├── lib/
    │   ├── prisma.ts                   # Singleton PrismaClient
    │   ├── auth.ts                     # NextAuth config
    │   ├── anthropic.ts               # Anthropic SDK singleton
    │   ├── challenges/loader.ts        # Reads /challenges/, parses into ChallengeDefinition
    │   ├── challenges/registry.ts      # In-memory Map<slug, ChallengeDefinition>
    │   ├── runner/sandbox.ts           # child_process spawn with timeout + kill
    │   ├── runner/test-runner.ts       # Write temp files, run jest, stream output
    │   ├── runner/output-parser.ts     # Parse Jest --json reporter
    │   ├── scoring.ts
    │   └── postmortem.ts              # Claude prompt builder
    ├── hooks/
    │   ├── useSession.ts               # Session CRUD + autosave
    │   ├── useTestRunner.ts            # SSE EventSource consumer
    │   ├── useHints.ts
    │   └── useFileEditor.ts            # Monaco model management
    ├── store/arena.ts                  # Zustand: files, tabs, test status, hints
    └── types/challenge.ts, session.ts, api.ts
```

---

## Database Schema (Prisma)

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  name         String?
  image        String?
  passwordHash String?
  createdAt    DateTime       @default(now())
  sessions     DebugSession[]
  accounts     Account[]
  authSessions Session[]
}

// Standard NextAuth tables: Account, Session, VerificationToken

model DebugSession {
  id            String        @id @default(cuid())
  userId        String
  challengeSlug String
  status        SessionStatus @default(IN_PROGRESS)
  startedAt     DateTime      @default(now())
  completedAt   DateTime?
  hintsUsed     Int           @default(0)
  attemptsCount Int           @default(0)
  timeTaken     Int?          // seconds
  score         Int?
  fileState     Json          @default("{}")  // Record<filename, content>
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  testRuns      TestRun[]
  hintRequests  HintRequest[]
  postmortem    Postmortem?
  @@index([userId, challengeSlug])
}

enum SessionStatus { IN_PROGRESS SUBMITTED COMPLETED ABANDONED }

model TestRun {
  id        String       @id @default(cuid())
  sessionId String
  runAt     DateTime     @default(now())
  status    RunStatus
  output    String       @db.Text
  passCount Int          @default(0)
  failCount Int          @default(0)
  duration  Int?
  session   DebugSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

enum RunStatus { RUNNING PASSED FAILED TIMEOUT ERROR }

model HintRequest {
  id          String       @id @default(cuid())
  sessionId   String
  level       Int
  requestedAt DateTime     @default(now())
  session     DebugSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model Postmortem {
  id          String       @id @default(cuid())
  sessionId   String       @unique
  content     String       @db.Text
  generatedAt DateTime     @default(now())
  session     DebugSession @relation(fields: [sessionId], references: [id])
}
```

Key decisions:

- `challengeSlug` is a string reference — no Challenge DB table; filesystem is canonical
- `fileState` is a `Json` column: `Record<filename, content>` — simple autosave
- `TestRun.output` stored as text — terminal replay on session resume

---

## Challenge Data Model

```typescript
// challenges/_schema.ts
interface ChallengeMeta {
    slug: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
    tags: string[];
    timeLimit: number;
    stack: string[];
    issueContext: string;
}
interface ChallengeFile {
    path: string;
    content: string;
    readOnly: boolean;
    language: string;
}
interface HintLevel {
    level: 1 | 2 | 3 | 4;
    title: string;
    content: string;
    penaltyPoints: number;
}
interface ChallengeDefinition {
    meta: ChallengeMeta;
    description: string;
    files: ChallengeFile[];
    hints: HintLevel[];
    testFiles: string[];
}
```

### Three Sample Challenges

| Challenge                 | Root Cause                                                                                                          | Fix                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `duplicate-chat-messages` | Redis subscriber created on every `socket.on('connection')`, never cleaned up on disconnect — stacks duplicate subs | Maintain `Map<socketId, subscriber>`, unsubscribe + quit on disconnect                                  |
| `memory-leak`             | `EventEmitter.on('message', handler)` added per user join in `room-manager.ts`, never removed on leave              | Call `emitter.removeListener('message', handler)` in leave/disconnect path                              |
| `payment-retry-bug`       | Webhook handler has no idempotency check — Stripe retries cause duplicate charges                                   | Check `processed_events` table for `paymentIntentId` before executing charge; insert on first execution |

Hints are **pre-written** in `hints.json` (4 levels each) — no Claude call per hint, only for postmortems.

---

## Browser IDE Layout

```
ArenaLayout (flex, full viewport, bg-gray-950)
├── TopBar (40px) — logo, title, timer (counts up), Run Tests, Submit
├── MainPanel (flex-1, flex-row)
│   ├── LeftSidebar (220px, resizable) — FileExplorer
│   ├── EditorPane (flex-1) — TabBar + CodeEditor (Monaco)
│   └── RightSidebar (380px, resizable, tabbed) — ProblemPanel | HintPanel
└── BottomPanel (220px, resizable) — TerminalPanel + test summary
```

**Monaco critical details:**

- Use `@monaco-editor/react` with `dynamic(() => import(...), { ssr: false })`
- One Monaco model per file path (preserves cursor/undo per file on tab switch)
- `theme: 'vs-dark'`, read-only files rendered with `opacity-60` tab
- Debounce 300ms on change → write to Zustand store

**Panel resizing:** CSS grid with `grid-template-columns/rows`, mouse-drag updates CSS custom properties. No external drag library.

---

## Test Runner Architecture

```
POST /api/sessions/[sessionId]/run-tests
  → test-runner.ts:
    1. Load fileState from DB
    2. Write files to: os.tmpdir()/arena-runs/{sessionId}-{runId}/
    3. Copy read-only test files from /challenges/[slug]/tests/
    4. Write package.json stub + jest.config.json
    5. sandbox.ts: spawn jest via child_process.spawn
       - Windows: use 'npx.cmd' not 'npx'
       - timeout: 30s (proc.kill() on Windows — no SIGTERM)
       - env: stripped to PATH + NODE_ENV=test + HOME only
       - flags: --forceExit --json --testTimeout=10000
       - --max-old-space-size=256 memory cap
    6. Stream stdout/stderr as SSE events
    7. On complete: parse --json output, persist TestRun, clean temp dir
  → SSE route handler → EventSource in useTestRunner hook → TerminalPanel
```

---

## API Routes

| Method | Path                                  | Auth     | Purpose                                  |
| ------ | ------------------------------------- | -------- | ---------------------------------------- |
| GET    | `/api/challenges`                     | public   | List all (meta only)                     |
| GET    | `/api/challenges/[slug]`              | required | Full definition (hints show titles only) |
| POST   | `/api/sessions`                       | required | Create/resume DebugSession               |
| GET    | `/api/sessions/[sessionId]`           | required | Session + file state                     |
| PATCH  | `/api/sessions/[sessionId]`           | required | Autosave fileState                       |
| POST   | `/api/sessions/[sessionId]/run-tests` | required | SSE stream of Jest output                |
| POST   | `/api/sessions/[sessionId]/hint`      | required | Request next hint level                  |
| POST   | `/api/sessions/[sessionId]/submit`    | required | Final submit + score                     |
| POST   | `/api/postmortem/[sessionId]`         | required | Claude postmortem (SSE stream)           |

---

## Scoring Algorithm (`lib/scoring.ts`)

```
base = 100
timePenalty:  0 if < 0.5× timeLimit, -10 if < 1×, -20 if < 1.5×, -30 otherwise
hintPenalty:  cumulative penaltyPoints from hints.json (L1:-5, L2:-10, L3:-15, L4:-25)
attemptPenalty: max(0, (attemptsCount - 1) * 2)
finalScore = max(0, base - timePenalty - hintPenalty - attemptPenalty)
```

---

## AI Integration (`lib/postmortem.ts`)

Uses `anthropic.messages.stream()` with `claude-sonnet-4-6`. Prompt template:

```
You are a senior engineer writing an incident postmortem for a developer who just fixed a production bug.
Challenge: {title} | Time: {timeTaken}s | Hints: {hintsUsed}/4 | Attempts: {attemptsCount}
Diff: {computedDiff from original files vs fileState}

Write sections: Summary, Timeline, Root Cause, Impact, Resolution, Lessons Learned, Prevention.
Be specific to the actual code change. Professional tone, no emojis.
```

---

## Key Dependencies

```json
{
    "dependencies": {
        "next": "14.x",
        "react": "^18",
        "@prisma/client": "^5",
        "next-auth": "^4",
        "@anthropic-ai/sdk": "^0.92.0",
        "@monaco-editor/react": "^4.7.0",
        "zustand": "^5",
        "zod": "^3",
        "react-markdown": "^9",
        "ansi-to-html": "^0.7",
        "clsx": "^2",
        "tailwind-merge": "^2",
        "lucide-react": "^0.400",
        "bcryptjs": "^2",
        "immer": "^10"
    },
    "devDependencies": {
        "prisma": "^5",
        "jest": "^29",
        "ts-jest": "^29",
        "monaco-editor-webpack-plugin": "*",
        "tailwindcss": "^3"
    }
}
```

---

## Zustand Store Shape (`store/arena.ts`)

```typescript
interface ArenaState {
    files: Record<string, string>; // path → current content
    originalFiles: Record<string, string>; // path → original (for diff)
    openTabs: string[];
    activeTab: string | null;
    dirtyFiles: Set<string>;
    testOutput: TestOutputLine[];
    testStatus: "idle" | "running" | "passed" | "failed" | "timeout";
    lastRunStats: { pass: number; fail: number; duration: number } | null;
    hintsRevealed: number; // 0-4
    hints: HintLevel[];
    sessionId: string | null;
    challenge: ChallengeDefinition | null;
    // Actions: openFile, closeTab, setFileContent, appendTestOutput, revealNextHint, ...
}
```

---

## Windows-Specific Notes

1. **jest spawn**: `process.platform === 'win32' ? 'npx.cmd' : 'npx'`
2. **process kill**: `proc.kill()` works on Windows (no SIGTERM support); no need for SIGKILL fallback
3. **temp paths**: always `path.join(os.tmpdir(), 'arena-runs', sessionId)` — never string concatenation
4. **file encoding**: `fs.writeFileSync(path, content, { encoding: 'utf-8' })`
5. **Monaco SSR**: `dynamic(() => import('@/components/ide/CodeEditor'), { ssr: false })`
6. **next.config.ts**: `MonacoWebpackPlugin` must be added inside `!isServer` webpack config branch

---

## Environment Variables (`.env.local`)

```
DATABASE_URL="postgresql://user:password@localhost:5432/debugging_arena"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with openssl rand -base64 32>"
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Implementation Phases

### Phase 1 — Scaffolding (~3h)

1. `npx create-next-app@14 . --typescript --tailwind --app` (in `D:\Debugging Arena`)
2. Install all dependencies
3. Configure `tailwind.config.ts` (dark VSCode theme tokens)
4. Configure `next.config.ts` (Monaco webpack plugin)
5. Write `prisma/schema.prisma`, run `npx prisma migrate dev --name init`
6. Create all directory stubs
   **Checkpoint:** `npm run dev` starts, Prisma Studio shows empty tables

### Phase 2 — Challenge Data Layer (~4h)

1. Write `challenges/_schema.ts` types
2. Write all 3 challenges: meta.json, description.md, hints.json, broken source files, test files
3. Write `lib/challenges/loader.ts` (fs.readdirSync, parse each challenge dir)
4. Write `lib/challenges/registry.ts` (Map<slug, ChallengeDefinition>)
5. Write `GET /api/challenges` and `GET /api/challenges/[slug]`
   **Checkpoint:** API returns 3 challenges with correct metadata

claude --resume 1e21afab-c87a-4ef0-b572-14ebc53c9f8e

### Phase 3 — Auth + Session (~3h)

1. Write `lib/auth.ts` (NextAuth credentials provider)
2. Write login/register pages
3. Write `POST /api/sessions` (create/resume), `GET`, `PATCH` (autosave)
   **Checkpoint:** Register → login → create session → fileState populated

### Phase 4 — Browser IDE (~10h) ← Largest phase

1. `store/arena.ts` — Zustand store
2. `hooks/useFileEditor.ts` — Monaco model management
3. `hooks/useSession.ts` — load + autosave
4. All `components/ui/` atoms
5. `CodeEditor.tsx` (Monaco, dynamic import)
6. `FileExplorer.tsx`, `TabBar.tsx`, `ProblemPanel.tsx`
7. `HintPanel.tsx`, `TerminalPanel.tsx`, `StatusBar.tsx`, `TopBar.tsx`
8. `ArenaLayout.tsx` — assemble all panels
9. `app/challenges/[slug]/arena/page.tsx`
   **Checkpoint:** Navigate to /challenges/duplicate-chat-messages/arena → IDE renders with files, Monaco, problem panel

### Phase 5 — Test Runner + SSE (~6h)

1. `lib/runner/sandbox.ts` — subprocess spawn with timeout
2. `lib/runner/output-parser.ts` — Jest --json parsing
3. `lib/runner/test-runner.ts` — temp files + jest orchestration
4. `POST /api/sessions/[sessionId]/run-tests/route.ts` — SSE handler
5. `hooks/useTestRunner.ts` — EventSource consumer
6. Wire RunButton → useTestRunner → TerminalPanel
   **Checkpoint:** Click Run Tests → Jest output streams in real-time → FAIL on unfixed code

### Phase 6 — Hints + Submit + Scoring (~4h)

1. `POST /api/sessions/[sessionId]/hint/route.ts`
2. `hooks/useHints.ts`, wire `HintPanel`
3. `lib/scoring.ts`
4. `POST /api/sessions/[sessionId]/submit/route.ts`
5. Submit modal + score display screen
   **Checkpoint:** Fix bug → submit → score with breakdown appears

### Phase 7 — Postmortem + Dashboard (~4h)

1. `lib/postmortem.ts` — Claude prompt + stream
2. `POST /api/postmortem/[sessionId]/route.ts`
3. `PostmortemReport.tsx` — streaming markdown render
4. `app/dashboard/page.tsx` — session history
5. `app/page.tsx` — challenge list with ChallengeCards
   **Checkpoint:** Complete challenge → postmortem streams in → dashboard shows score

### Phase 8 — Polish (~4h)

- Loading skeletons, error boundaries
- Session resume (navigate away + back → state restored)
- Windows path edge cases (`path.posix` vs `path.win32`)
- End-to-end smoke test

---

## Verification (End-to-End Smoke Test)

```
1. Auth: Register → login → see 3 challenge cards
2. IDE Load: Start "Duplicate Chat Messages" → files visible, Monaco renders
3. Test Runner (broken): Click Run Tests → streams FAIL output
4. Edit: Fix the reconnect listener bug, wait 1s autosave
5. Test Runner (fixed): Run Tests → PASS
6. Hints: On a different session, reveal hints 1→2, verify cost shown
7. Submit: Click Submit Fix → score screen with breakdown
8. Postmortem: View Incident Report → Claude streams markdown sections
9. Dashboard: /dashboard shows completed challenge with score + time
```

---

## Critical Files

| File                                 | Why Critical                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `prisma/schema.prisma`               | All API routes depend on correct models being generated first                    |
| `src/lib/challenges/loader.ts`       | Bridge between file-based challenges and runtime — every route depends on it     |
| `src/lib/runner/test-runner.ts`      | Core value prop — temp file write, Jest spawn, SSE stream, result persist        |
| `src/components/ide/ArenaLayout.tsx` | Root of entire IDE UI — assembles all panels                                     |
| `src/store/arena.ts`                 | Single source of truth for all IDE state — every IDE component reads/writes here |
