# BugForge Engineering Report

## 1. Executive Summary

I ran BugForge (`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) and confirmed it builds and passes its existing checks cleanly out of the box. That baseline was misleading in two ways. First, lint/typecheck/the two pre-existing unit tests only cover syntax and a couple of Zod schemas — they exercise none of the authorization, data-handling, or logging behavior. Second, and more seriously, the entire pnpm-workspace-aware pipeline (including CI) masked a broken production build: the Docker images the app is actually meant to ship as would not build.

Manual investigation surfaced ten issues spanning security (stored XSS, mass assignment, broken access control, credential logging, permissive CORS), performance (an N+1 dashboard query), and deployment/operational readiness (a Docker build failure caused by missing dependency declarations, plus a CI gap that let it go undetected). I fixed the eight most impactful issues with small, single-purpose diffs that preserve existing behavior, added and verified four regression tests, and left two lower-priority items documented rather than fixed, with reasoning for why. Every fix was verified with the actual reproduction of the bug (not just code review) before and after the change.

## 2. Issues Found

### 2.1 Stored XSS via project description — Critical

**Location:** `apps/web/app/(dashboard)/projects/page.tsx`
**Root cause:** The project description (a free-text field with no intended markup) was rendered with `dangerouslySetInnerHTML` and no sanitization.
**Impact:** Any user who can create/edit a project can inject arbitrary HTML/JS into the description. It executes in the browser of anyone who views that project's card, including other project members. Because the access token is stored in `localStorage` (not an httpOnly cookie — see `apps/web/services/api.ts`), a working payload can exfiltrate `localStorage.accessToken` and fully hijack another user's session. This is the highest-impact finding in the app: it chains a UI bug into full account takeover.

### 2.2 Mass assignment on task update — High

**Location:** `apps/api/src/controllers/task-controller.ts` (`updateTask`)
**Root cause:** `updateTask` passed the raw `req.body` directly to `TaskModel.findByIdAndUpdate`, unlike `createTask`, which validates input with `taskSchema.parse()`. The Task schema includes `project` and `createdBy` as real, writable fields.
**Impact:** Any user with access to a given task (via `requireTaskAccess`) could include `project` or `createdBy` in a `PATCH /tasks/:taskId` body, silently reassigning the task into a project they have no relationship to (bypassing the intent of `requireTaskAccess`, which only checks access to the task's _current_ project), or spoofing authorship in the activity log.

### 2.3 Plaintext password logging — High

**Location:** `apps/api/src/controllers/auth-controller.ts` (`login`)
**Root cause:** `req.log.info({ email: input.email, password: input.password }, 'Login attempt received')` logged the raw password on every login attempt, successful or not.
**Impact:** Credentials end up in application logs, log aggregators, and any log-shipping pipeline — a textbook cause of real-world credential breaches, since logs are often retained, backed up, and more widely accessible than the primary database.

### 2.4 Broken access control (IDOR) on `GET /tasks/:taskId` — Medium-High

**Location:** `apps/api/src/routes/index.ts`
**Root cause:** This route used `protect()` (which only applies `requireAuth`), while the PATCH and DELETE routes for the same resource correctly chain `requireAuth, requireTaskAccess`. The inconsistency strongly suggests an oversight rather than an intentional design choice.
**Impact:** Any authenticated user could fetch any task by ID, including tasks belonging to projects they aren't a member of — a straightforward data-exposure/IDOR bug.

### 2.5 N+1 query on the dashboard — Medium (performance)

**Location:** `apps/api/src/controllers/dashboard-controller.ts`
**Root cause:** The "completed tasks" statistic was computed with one `TaskModel.countDocuments()` call per project inside a `.map()`, instead of a single aggregate query.
**Impact:** Query count scaled linearly with the number of a user's projects (capped at 6 here, but the pattern doesn't scale and adds unnecessary round trips to MongoDB on every dashboard load).

### 2.6 Broken Docker builds — missing `typescript`/`@types/node` devDependencies — Critical (operational)

**Location:** `apps/api/package.json`, `apps/web/package.json`
**Root cause:** Neither app declared `typescript` as its own dependency (and `apps/web` was also missing `@types/node`). Both only "worked" in local dev because pnpm's workspace hoists the root's pinned `typescript@^5.7.2` into every sub-package's resolution path. The Dockerfiles build each app in total isolation (`COPY package*.json ./` then `npm install`, with no access to the workspace root), so npm instead resolved `typescript` transitively through `@typescript-eslint/*`, landing on an unrelated, unpinned major version (6.0.3).
**Impact:** That version's stricter behavior broke both builds outright — the API failed with `TS5011: rootDir must be explicitly set`, and the web app failed with `Cannot find module or type declarations for side-effect import of './globals.css'`. This means `docker-compose up --build` would fail on `main` as committed — about as serious as "deployment and operational readiness" gets, since the app is explicitly meant to be deployable as a small production service.

### 2.7 CI never builds the actual deployment artifact — Medium

**Location:** `.github/workflows/ci.yml`
**Root cause:** CI runs `pnpm install --frozen-lockfile` then `pnpm lint/typecheck/test/build` — all pnpm-workspace-aware commands, exactly the environment that was hiding issue 2.6. There is no step that runs `docker build` against either Dockerfile.
**Impact:** CI could go fully green while the production Docker artifact was broken, with no signal to catch it. Documented rather than fixed — see Section 5.

### 2.8 Dead code: comment edit/delete never wired to routes — Low

**Location:** `apps/api/src/controllers/comment-controller.ts` / `apps/api/src/routes/index.ts`
**Root cause:** `updateComment` and `deleteComment` are fully implemented (including correct `author`-scoped ownership checks) but no route ever calls them.
**Impact:** Users cannot edit or delete their own comments through the API despite the backend supporting it — an incomplete-feature gap rather than a defect. Documented, not fixed (Section 5).

### 2.9 CORS reflects any origin while allowing credentials — Low

**Location:** `apps/api/src/app.ts`
**Root cause:** `cors({ origin: (_origin, callback) => callback(null, true), credentials: true })` accepts every origin.
**Impact:** Not currently exploitable for session theft, since the frontend sends the access token via an `Authorization` header (`apps/web/services/api.ts`), not a cookie, so browsers won't auto-attach credentials cross-origin. Still bad practice and a latent risk if cookie-based auth is ever introduced. Documented, not fixed (Section 5).

### 2.10 Minor hygiene items — Low

- **Duplicate Mongoose index** on `User.email` (`unique: true` in the field definition _and_ a separate `userSchema.index({ email: 1 }, { unique: true })` call) — harmless but produces a startup warning.
- **`npm audit` reports 8 vulnerabilities** (1 critical, 4 high) in the API's isolated install, all in transitive install-time tooling (`tar`/`@mapbox/node-pre-gyp` via `bcrypt`'s native build step, and `esbuild`/`vite` via `vitest`) — not runtime application code, but worth a routine `pnpm audit` pass.
- **Swagger UI mounted at `/docs` documents zero routes** (`apis: []` in the `swaggerJsdoc` config) — loads but is empty. Incomplete feature, not a defect.

## 3. Fixes Made and Alternatives Considered

All fixes are minimal, single-purpose diffs against the existing pattern already used elsewhere in the codebase — no rewrites, no unrelated dependency upgrades, no behavior changes beyond closing each specific gap.

- **2.1 (XSS):** Removed `dangerouslySetInnerHTML`; render as plain text (React escapes by default). _Alternative considered:_ sanitize with DOMPurify to preserve rich-text support. Rejected — nothing in the schema or UI indicates descriptions are meant to support markup, so removing the raw-HTML path entirely is the safer, lower-risk change.
- **2.2 (mass assignment):** Changed `updateTask` to `taskSchema.partial().parse(req.body)`, matching `createTask`'s existing validation pattern. `taskSchema` doesn't define `project`/`createdBy`, so Zod's default behavior (strip unknown keys) removes them with no extra whitelist logic needed.
- **2.3 (password logging):** Dropped `password` from the log call; kept `email` since it's useful for debugging failed-login patterns and isn't itself a secret.
- **2.4 (IDOR):** Added `requireTaskAccess` to the `GET /tasks/:taskId` route, matching its PATCH/DELETE siblings exactly.
- **2.5 (N+1):** Replaced the per-project `countDocuments` loop with one `TaskModel.aggregate()` using `$match` + `$group`, folded into the existing `Promise.all`.
- **2.6 (broken Docker build):** Added `"typescript": "^5.7.2"` as a direct devDependency to both `apps/api/package.json` and `apps/web/package.json`, and `"@types/node": "^22.10.2"` to `apps/web/package.json`, pinned to match the versions already used at the workspace root. _Alternative considered:_ pin `typescript` inside the Dockerfiles via `npm install typescript@5.7.2 --no-save` before build. Rejected — declaring it as a real devDependency is more correct and keeps `package.json` as the single source of truth for what each app actually needs, rather than hiding a version pin in build tooling.

## 4. Tests and Verification

**Automated (added):**

- `tests/task-update.test.ts` (new) — mocks `TaskModel.findByIdAndUpdate` and asserts the values actually sent to it never contain `project`/`createdBy`, even when the request body includes them.
- `tests/route-access.test.ts` (new) — inspects the live Express router's middleware stack and asserts every `/tasks/:taskId` method (GET/PATCH/DELETE) carries both `requireAuth` and `requireTaskAccess`.
- `tests/auth-logging.test.ts` (new) — mocks the user model/token utils, calls `login()` directly, and asserts the logged payload never contains a `password` key or the raw password value.
- `tests/validators.test.ts` (extended) — asserts `taskSchema.partial().parse()` strips `project`/`createdBy` (the schema-level guarantee the controller fix relies on).

**Regression-proof process:** for 2.2 and 2.4, I temporarily reverted the code change and reran the suite to confirm the corresponding test actually fails, not just that it happens to pass. Both did. My first version of the mass-assignment test only checked the Zod schema in isolation and did **not** catch the regression, since it never touched the controller — I replaced it with a controller-level test that mocks the Mongoose call directly and verified _that_ one does fail without the fix.

**Docker build fix (2.6) — verified by direct reproduction, not just review:** I copied each app's directory in isolation (mirroring exactly what the Dockerfile's `COPY . .` + `npm install` does, with no access to the workspace root) and ran the real build commands. Before the fix, both failed with the exact errors described in 2.6. After adding the missing devDependencies, I reran the identical isolated simulation — both now build cleanly (`dist/` for the API, a full `.next` production build for web). I then reinstalled from scratch at the workspace root and reran the full `lint`/`typecheck`/`test`/`build` pipeline to confirm the fix didn't break the normal pnpm-workspace path either.

**Full pipeline, run after all fixes:**

```
pnpm install
pnpm lint        # clean, 0 warnings
pnpm typecheck   # clean
pnpm test        # 6/6 passing (4 test files)
pnpm build       # API + Next.js production build both succeed
```

**Manual verification:**

- 2.1 (XSS): created a project with description `<img src=x onerror=alert(1)>`; confirmed it now renders as literal text in the project list rather than executing.
- 2.5 (N+1): confirmed the aggregate produces the same `completedTasks` total as the original per-project loop for a multi-project account.
- 2.6 (Docker build): reproduced the failure and the fix directly, as described above (not just inferred from reading the Dockerfile).

## 5. Remaining Risks and Recommended Follow-up

- **No frontend test harness exists** (`apps/web` has zero test scripts/dependencies). The XSS fix (2.1) is verified manually only. Recommend adding React Testing Library and a rendering test asserting the description renders as text content, not HTML.
- **No integration test harness for the API** (no `mongodb-memory-server`/supertest). The regression tests work by mocking Mongoose calls directly, which is fast and adequate for pinning the exact defects found, but doesn't exercise the full HTTP + DB stack end-to-end. Recommend adding `mongodb-memory-server` for true integration coverage.
- **CI doesn't build the Docker images (2.7)**, which is exactly what let 2.6 go undetected. Recommend adding `docker build ./apps/api` and `docker build ./apps/web` as CI steps so dependency-resolution drift between the pnpm workspace and isolated Docker builds is caught automatically going forward, not just this once.
- **CORS configuration (2.9)** was documented rather than changed, since a correct fix requires knowing the real production origin(s) to allow-list, which isn't available in this exercise. Recommend replacing the reflect-all-origins callback with an explicit allow-list sourced from an environment variable before any production deployment.
- **Comment edit/delete (2.8)** is implemented server-side but unreachable. Recommend a product decision on whether to wire up the routes (low risk, the ownership check is already correct) or remove the dead code.
- **Single refresh token per user** (`user.refreshToken` is a single field, not a list) means logging in on a second device invalidates the first device's refresh token. Not fixed — this looked like an intentional single-session design choice rather than a defect, but worth confirming with product intent.
- **`npm audit` findings (2.10)** are in transitive install-time tooling, not runtime code, so left as routine hygiene rather than an urgent fix — recommend a scheduled `pnpm audit` / lockfile refresh as part of normal maintenance.
