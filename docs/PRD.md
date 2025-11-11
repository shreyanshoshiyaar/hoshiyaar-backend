## Hoshiyaar – Backend Product Specification (PRD)

- **Service name**: Hoshiyaar Backend API
- **Codebase**: `Hoshiyaar-backend-main`
- **Tech stack**: Node.js, Express, Mongoose/MongoDB, Cloudinary (optional), CORS
- **Primary domains**: Auth & Progress, Curriculum (Board/Class/Subject/Chapter/Unit/Module/Items), Lessons import, Review (Incorrect/Defaults), Uploads

### 1) Problem statement
Serve reliable APIs for onboarding, content delivery, quiz progress, and spaced review to power the Hoshiyaar learning app.

### 2) Goals and objectives
- Provide normalized curriculum data with scalable imports.
- Persist per-user lesson/quiz progress and completion.
- Enable review flows (user-incorrect and default pools).
- Offer secure, ergonomic APIs with production CORS and timeouts.

### 3) Users and consumers
- Frontend SPA (Hoshiyaar).
- Admin/content operators via import/upload endpoints (restricted in production).

### 4) In-scope features
- Auth: username + dateOfBirth login; JWT issuance for future-proofing.
- Onboarding/profile updates with normalized references (boardId/classId/subjectId/chapterId).
- Progress: track per-lesson stats and per-chapter completion, plus per-module completion IDs.
- Curriculum: hierarchical entities (Board → Class → Subject → Chapter → Unit → Module → Items); import and listing endpoints.
- Lessons: import lesson concepts directly into `LessonItem` (legacy/simple path).
- Review: save and fetch incorrect questions; list default revision questions by scope; import defaults.
- Uploads: single/multiple image upload via Cloudinary (if configured).

### 5) Out of scope
- Payments, roles/permissions beyond basics.
- Complex moderation workflows.
- Full-text search.

### 6) Success metrics
- API p95 latency < 300ms for reads, < 700ms for writes (typical payloads).
- Error rate < 1% excluding client/network errors.
- Data integrity: zero duplicate user-incorrect (enforced unique compound index).

### 7) High-level architecture
- Express app with modular routers mounted under `/api/*`.
- MongoDB via Mongoose with explicit indexes and startup index-sync/migrations.
- Optional Cloudinary integration (env gated).
- CORS allowlist for prod and local dev.

### 8) Routing and endpoints

Base URL: defaults to `PORT` 5000. CORS origins include `https://www.hoshiyaar.info`, local dev hosts, and Render frontend.

- Root
  - `GET /` → health text "API is running..."

- Auth (`/api/auth`)
  - `POST /register` → create user; resolves board/class/subject/chapter by names when provided; sets `onboardingCompleted` if selections present.
  - `POST /login` → username + dateOfBirth authentication; returns user and JWT (30d).
  - `PUT /onboarding` → updates username, profile, and selections; resolves and stores normalized IDs; toggles onboarding completion.
  - `GET /user/:userId` → returns user public fields + normalized IDs.
  - `GET /check-username?username=` → `{ available }`.
  - `GET /progress/:userId` → returns `chaptersProgress` array.
  - `GET /module-progress/:userId?subject&chapter` → returns per-chapter flags and `completedModules`.
  - `PUT /progress` → updates chapter progress; per-lesson stats; best/last score; per-module completion; invalidates cache.
  - `GET /completed-modules/:userId?subject` → cached list of completed module IDs.
  - `GET /verify-storage/:userId` → debug aggregation of totals.

- Curriculum (`/api/curriculum`)
  - `POST /import` → upsert Board/Class/Subject/Chapter/Unit; upsert Modules per lesson; create `CurriculumItem`s from concepts (statement/mcq/fill-in/rearrange).
  - `GET /boards` | `GET /classes?board=` | `GET /subjects?board=&classTitle=&userId=`
  - `GET /chapters?board=&subject=&classTitle=&userId=`
  - `GET /units?chapterId=`
  - `GET /modules?chapterId=|unitId=`
  - `GET /items?moduleId=`
  - `PUT /items/:id/image` → set or append image(s).
  - `POST /backfill-subjects` → ensure subject per board/class and attach chapters.
  - `POST /backfill-units` → ensure units and assign modules; report counts.
  - `POST /seed-basic-data` → seed minimal demo hierarchy.

- Lessons (`/api/lessons`)
  - `GET /:moduleNumber` → list `LessonItem` by numeric module index.
  - `POST /:moduleNumber/import` → import lesson concepts to `LessonItem` records.

- Review (`/api/review`)
  - `POST /incorrect` → upsert incorrect `{ userId, questionId, [moduleId], [chapterId] }` with counters and timestamps.
  - `GET /incorrect?userId&moduleId|chapterId` → list incorrect IDs for user (recent first, capped).
  - `POST /backfill` → derive `moduleId` from `questionId` prefix; maintenance-only.
  - `GET /defaults?moduleId|unitId|chapterId|subjectId` → list default revision questions by scope.
  - `POST /defaults/import` → import defaults from lesson-like payload into `DefaultRevisionQuestion`.

- Upload (`/api/upload`)
  - `POST /image` → single image upload (Cloudinary middleware).
  - `POST /images` → multiple image upload.

### 9) Data model highlights
- `User`: username (unique), profile fields; name-based selections for backward compat; normalized refs `boardId`, `classId`, `subjectId`, `chapterId`; `chaptersProgress[]` with per-lesson stats Map and `completedModules`.
- `Board`, `ClassLevel`, `Subject`, `Chapter`, `Unit`, `Module`: hierarchical curriculum entities with `order` fields and indexes.
- `CurriculumItem`: typed content per module (statement/mcq/rearrange/fill-in) with media fields and ordering.
- `LessonItem`: legacy/simple lesson storage addressed by numeric `module` and `order`.
- `UserIncorrectQuestion`: unique by `(userId, questionId)`; counts, last/first seen, optional moduleId/chapterId.
- `DefaultRevisionQuestion`: scope by subject/chapter/unit/module; typed question payload; ordering.

### 10) Non-functional requirements
- CORS allowlist enforced; credentials allowed.
- Environment-driven configuration: `MONGO_URI`, `JWT_SECRET`, Cloudinary keys.
- Startup index sync and legacy index cleanup for `Subject`, `ClassLevel`, `User`.
- Logging for critical flows (progress updates, curriculum queries, imports).

### 11) Error handling and validation
- Robust query/body validation for required params (`userId`, `moduleId`/`chapterId`, `moduleNumber`, etc.).
- Use 4xx for client errors, 5xx for server issues; never leak stack traces to clients.
- Safe fallbacks when resolving references; do not fail onboarding if name-based resolution fails.

### 12) Caching
- In-memory cache for `completed-modules` per `userId::subject` with short TTL (30s).

### 13) Security considerations
- JWT issued at login; most endpoints currently public for MVP—add auth middleware before production hardening.
- Sanitize and limit import endpoints; protect with admin auth in production.

### 14) Operational
- Port: `process.env.PORT || 5000`; binds `0.0.0.0` and logs mobile-access URL.
- Graceful process exit on DB connection error.

### 15) Acceptance criteria (high-level)
- CRUD and listing endpoints for curriculum return consistent, ordered results.
- Progress updates reflect on subsequent reads; module completion IDs computed and cached.
- Review incorrect save and list work and are idempotent per `(userId, questionId)`.
- Defaults list/import function by provided scope and align with lesson payloads.
- CORS permits the intended frontends and blocks others.


