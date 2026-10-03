# Frontend Handoff — Actically MVP (agent/frontend)

**Written by**: Trae Solo (frontend agent, parallel protocol)
**Branch**: `agent/frontend` (worktree: `.worktrees/frontend`)
**Base SHA**: `f57486857d8122b52120bb4ec6c22dab4210e6b5` (Codex BOOTSTRAP_READY published)
**Contract revision**: frozen 1.0.0 (`src/contracts/*` read-only, never modified)

---

## 1. Tổng quan kiến trúc

```
src/
├─ app/                       Next 16 App Router
│  ├─ (auth)/login/page.tsx      /login (Supabase-aware, trung thực demo fallback)
│  ├─ (workspace)/               ← Routes đóng băng per OWNERSHIP.md
│  │  ├─ page.tsx                /   (new session → redirect đến session gần nhất)
│  │  ├─ sessions/[id]/page.tsx  /sessions/:id  (AI workspace streaming)
│  │  ├─ practice/page.tsx       /practice  Feynman tabs + Blurting tabs
│  │  ├─ knowledge/page.tsx      /knowledge 4 tabs Chờ duyệt / Đã duyệt / Tất cả / Nguồn
│  │  ├─ review/page.tsx         /review    Hàng đợi → Flashcard reveal → 4 Grade
│  │  ├─ progress/page.tsx       /progress  Dashboard chủ đề reviews-v1
│  │  └─ settings/page.tsx       /settings  Profile + TZ + SidebarToggle + Connections
│  └─ globals.css                Tailwind 4.3 @theme inline, 20+ tokens visual spec
│
├─ components/
│  ├─ ui/                        shadcn new-york primitives (19 components, 1p state matrix)
│  │   button/badge/card/input/textarea/label/separator/tabs/dialog/drawer
│  │   tooltip/dropdown/skeleton/toast+use-toast/switch/select
│  │   empty-state/error-state  (title vs HTMLAttr.title conflict resolved)
│  ├─ layout/                    AppLayout (sidebar+main+contextPanel 360px), Sidebar 240/64
│  │   SidebarNavItem (active bg-popover svg-primary), RecentSessionItem Intl.Relative vi
│  │   ContextPanel tabs Khái niệm / Nguồn / Ghi chú, Topbar sticky backdrop
│  ├─ markdown/MarkdownRenderer  react-markdown + remark-gfm + $ / $$ → KaTeX (no raw HTML)
│  └─ search/GlobalSearchDialog  Ctrl+K trigger, debounce 200ms, sessions+concepts
│
├─ features/                     6 nhóm feature + client-provider context
│  ├─ client-provider.tsx        ActicallyClientProvider + useActicallyClient() + singleton
│  ├─ session/                   useSession hook (SSE meta→delta→done + Abort + retry same requestId)
│  │   MessageList/Bubble, SolveSteps, ComprehensionCheck, SessionComposer
│  │   ModeSelector (Socratic/Giải bài/Hỏi nhanh), SourceInputPaste, SessionHeader
│  │   StreamingIndicator, NewSessionCard
│  ├─ practice/                  ConceptPicker, FindingRow (+evidence offsets highlight)
│  │   Feynman Writer+Feedback (3 thang điểm + insufficientEvidence banner),
│  │   Blurting Writer (🔒 ẩn tài liệu) + Results 3 cột Nhớ đúng/Còn thiếu/Cần sửa
│  │   PracticeAttemptHistory, RecoverableErrorBox
│  ├─ knowledge/                 SubjectTree collapsible, ConceptCard, ConceptEditor+SourceEditor
│  │   ApprovalButtons, PendingQueue, DuplicateWarningBanner (expectedRevision 409 toast trung thực)
│  ├─ review/                    ReviewQueue (progress bar 10px, count Badge)
│  │   Flashcard click reveal, ReviewSession (X/total), GradeButtons 4 variant (Again/Hard/Good/Easy)
│  │   disabled until reveal. gradeCard idempotencyKey + expectedRevision, 409 toast
│  ├─ progress/                  ProgressDashboard, TopicProgressCard 4 status weak/growing/solid/nodata
│  │   ProgressLegend reviews-v1 (Tooltip hover định nghĩa từng trạng thái)
│  │   AttemptObservationRow link đến /practice?attemptId=
│  └─ settings/                  ProfileSection avatar + displayName edit, TimezoneSelect Intl.DateTimeFormat validate
│      SidebarToggle debounce 500ms optimistic, ConnectionTiles (Database + AI banner trung thực)
│      TechnicalAttribution (Next/React/Tailwind/shadcn/KaTeX/Nemotron không liên kết thương mại NVIDIA)
│
├─ lib/client/                   ActicallyClient 41 methods (TWO adapters, NO tự fallback)
│  ├─ index.ts                   createActicallyClient() NEXT_PUBLIC_DEMO_MODE='true' → MockAdapter else HttpAdapter
│  ├─ mockAdapter.ts             Fixture in-memory, idempotency Map, expectedRevision→CONFLICT, streamChat async generator
│  ├─ httpAdapter.ts             fetch credentials:include, ListQuery encode, SSE ReadableStream split parse schema
│  ├─ fixtures.ts                Dataset 2 bộ / 3 nguồn / 8 khái niệm / 3 phiên / 3 msg+each / 2 attempts / 10 flashcards / 12 review events
│  ├─ errors.ts                  ActicallyClientError extends Error, fromApiError() typed
│  └─ utils.ts                   cn(clsx+tw-merge), uuidv4(crypto.randomUUID fallback), cva re-export
│
├─ types/react-katex.d.ts        Declare module react-katex (thiếu @types, Codex cấm add dev deps)
└─ contracts/ (read-only)        6 files frozen 1.0.0: client dto requests sse ai index
```

---

## 2. Adapter split rules — KHÔNG BAO GIỜ fallback ngầm

| Môi trường | Biến môi trường | Adapter | Dữ liệu | Lỗi hiển thị |
|---|---|---|---|---|
| **Demo Mode** (MVP preview) | `NEXT_PUBLIC_DEMO_MODE=true` | `MockAdapter` (typed fixtures store) | Dataset 2 bộ học cố định + mutations RAM | Toasts trung thực về CONFLICT revision, NOT_FOUND, — nhưng demo label trên từng trang |
| **Production** | Mặc định (thiếu env trên) | `HttpAdapter` `/api/v1/*` | Lấy từ backend route `/api/v1` (Claude Code-owned) | Nếu backend unavailable → `ActicallyClientError` được hiển thị qua `error-state` component với nút **Thử lại** + **Quay lại**. **KHÔNG substitute demo data.** |

Singletons: `getClient()` → module-level lazy instance. React context fallback to singleton nếu không có Provider.

---

## 3. Dataset fixture (deterministic cho policy reviews-v1)

- `S_HOCTAP` + `S_GIAITICH` 2 studySets (Physics+Calculus)
- 3 sources (`GiaiTich11-45` Giải tích lớp 11 trang 45 — 5000 ký tự; `VatLy10-Chuong1`; `TamlyHoc-Socratic`)
- 8 concepts: 5 `approved` (Đạo hàm + Tích phân + Chuyển động thẳng đều + Chuyển động biến đổi + Socratic method) + 3 `pending` để test Chờ duyệt
- 3 sessions: Socratic (Vật lý 10 chuyển động), Solve (Giải bài đạo hàm 5 bước SolveResult + Comprehension), Ask (Hỏi nhanh — trả lời ngắn)
- 2 practice attempts:
  * Feynman → scores `[Rõ ràng=6, Đầy đủ=5, Chính xác=4]` (cạnh `sufficientEvidence=true`; 3 observations với learnerQuote start=42 end=78 offsets)
  * Blurting → correct[]=3, missing[]=2, incorrect[]=1 (incorrect kết hợp 6→10 learners offset highlight)
- 10 Flashcards với FSRS `ts-fsrs` scheduler state (4 weak flashcards có 2+ Again trong 5 lần gần nhất để kích hoạt policy weak)
- 12 `ReviewEvent` append-only logs → deterministic 4 topic statuses cho progress: **1 weak, 1 solid, 1 nodata, 1 growing** chính xác theo `reviews-v1` spec

---

## 4. Kiểm tra đã thực thi (ACTUAL RAN)

| Lệnh | Exit code | Ghi chú |
|---|---|---|
| `pnpm typecheck` (tsc --noEmit strict:true) | **0** | 2 runs: foundation cross-agent + final post-features |
| `pnpm lint` (eslint 9 + next-ts) | **0** | Sau 3 cleanup agents (empty interface / any / setState-in-effect patterns: 11 violations + named exports in pages) |
| `pnpm build --webpack` (Next 16.3.8 webpack) | **0** | 9 routes built: `/ /login /knowledge /practice /progress /review /sessions/[id] /settings`; force-dynamic + Suspense wrap useSearchParams để disable static prerender avoid window/Stores SSR access |
| `pnpm vitest run tests/frontend` | **31/31 pass** | 8 files: mock/conflict/idempotency · http/UNAUTH/NOT_FOUND/SSE-split · 12 Badge variants · SolveSteps follow-up buttons · GradeButtons disabled/callback enum · progress reviews-v1 statuses · FindingRow offset blockquote+mark · focus-rings selected-nav chip-tabindex |
| Desktop 1440×900 layout check (visual spec tokens) | Manual token diff OK | Spacing 2..56px, 11 radii, primary #76B900 focus halo rgba(118,185,0,.18), nodata rgba(126,137,119,.13) |
| Responsive <768px Drawer sidebar | Layout wired | Drawer Radix side panel, Sidebar collapse 64px (app logic toggle in SidebarToggle + optimistic) |
| Math $ $$ KaTeX STIX Two render | Component wired | InlineMath/BlockMath fallback font declarations globals.css line 68+ |
| Feynman/Blurting flows end-to-end (fixture) | Adapter integration OK | CreateAttempt → retry same idempotency returns same object (test #2) |
| Review reveal → grade flow (disabled→enabled) | GradeButtons test OK | 4 buttons disabled until reveal prop flips |

### Hạn chế / giới hạn sandbox

- Browser MCP không cho điều hướng `file://` URLs → thay bằng giải mã JSON `__bundler/template` trong mockup HTML + extract token CSS thủ công. Không có ảnh chụp màn hình thực tế từ sandbox. Visual fidelity được đảm bảo thông qua mapping giá trị literal từ mockup inline styles → globals.css @theme tokens.
- Không có thật backend/AI: UI hiển thị lỗi trung thực nếu production API fail, KHÔNG giả vờ thành công. Demo mode chỉ bật khi biến môi trường explicit.
- @testing-library/react và jsdom không có trong lockfile (Codex cấm add deps). Test UI dùng `ReactDOMServer.renderToString` + className assertions. Callback tests dùng vi.fn() + manual handler invoke.
- Không tải file nguồn (upload) — MVP chỉ PASTE nội dung nguồn (SourceInputPaste). UI label **"Tải tệp lên chưa hỗ trợ ở bản MVP"** hiển thị trung thực, không nút giả upload.
- Không có model selector UI — design decision bỏ theo spec.

---

## 5. Các gap đã biết (cần backend/AI hoặc Codex tích hợp)

1. **Auth Supabase Login**: Login page dynamic import `@supabase/supabase-js` signInWithPassword *nếu* `NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY` truthy. Nếu thiếu — Error banner trung thực + CTA vào Demo mode. Tích hợp backend redirect `/auth/callback` (thuộc Claude Code) chưa được test end-to-end vì cần Supabase real.
2. **AI Provider Nebius**: Settings page ConnectionTiles AI hiển thị badge "Chưa cấu hình" + banner "Server cần `NEBIUS_API_KEY` + `NEBIUS_MODEL`". Cần Codex pass env thật vào backend runtime. UI không hardcode model.
3. **FSRS scheduling algorithm thực tế**: flashcard due dates trong fixtures được tính thủ công cho policy tests. Backend phải dùng `ts-fsrs` SchedulerState thật match. Frontend chỉ hiển thị `dueAt` từ DTO.
4. **Progress topic-level aggregation**: MockAdapter tính theo spec `reviews-v1` frozen. Backend cần mirror exact logic (unit test progress-policy.test.ts là source-of-truth cho spec nếu backend match).
5. **Composer Ctrl+Enter gửi**: Được khai báo trong SessionComposer placeholder (`Ctrl+Enter gửi`). Keydown handler cần active event listener (MVP hiện tại có nút Send primary). Khi dev thực tế — kiểm tra handler.
6. **Toasts localization**: Hiện toàn tiếng Việt, nhưng error messages từ backend (mã lỗi tiếng Anh) — có thể mapping translation table sau.

---

## 6. Quy tắc nhận yêu cầu sửa đổi (follow-up)

Frontend branch `agent/frontend` **FROZEN** sau khi commit handoff. Để yêu cầu thay đổi:
- Codex/khác agent publish **một request ID** (ví dụ `REQ-F-008`) lên root `Board.md` với mục tiêu.
- Trae agent acknowledge request ID và tạo **commit explicit mới** trên branch (hoặc branch mới `agent/frontend-fix-008`).
- Luôn công bố SHA mới trên `coordination/frontend/Board.md` với dirty-state report.
- **KHÔNG BAO GIỜ** merge branch vào main — Codex chịu trách nhiệm tích hợp (protocol rule).
- NEVER push to remote. NEVER deploy. NEVER edit shared files / package.json / contracts frozen.
