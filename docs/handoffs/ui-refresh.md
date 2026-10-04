# Frontend UI refresh

Owner request, 2026-10-04 (Asia/Saigon client date): redo the broken, inconsistent frontend and icon treatment. Implemented in the canonical root on `coordinator/integration` under the existing frontend takeover authorization. Code commit: `66af68312038a3d34f8668e214df5cb2d0908a27`.

## Root cause and changes

The global theme redefined Tailwind's numbered spacing tokens as literal pixel values. For example, `w-5` compiled to 5px instead of 20px, `h-14` to 14px instead of 56px, and `w-56` to 56px instead of 224px. This shrank icons, navigation, controls and menus throughout the application. Removed these overrides and restored the 0.25rem scale. Global link styles now sit in the base layer so component text colors work.

The shared shell now has a 240px sidebar, 64px collapsed rail, 64px topbar, clear active navigation, labelled icon controls and an accessible mobile menu. Navigation and page titles share one route map. Existing dark olive/lime colors are retained with quieter borders, consistent Lucide stroke weight, a shared Actically mark and consistent control heights. Typography uses Be Vietnam Pro when locally available, falling back to Segoe UI; no external font fetch was added.

Home, practice, knowledge, review, progress and settings use a shared page header and bounded content area. CSS container queries choose split layouts from the available workspace width, including when the sidebar is present. Content cards size from their actual grid width. Forms, source references, score tiles, account settings and dialogs adapt to narrow space. The home page provides study mode selection, source entry, useful navigation and a collapsible recent-session list.

Chat uses one scrolling transcript and a bounded composer. Message widths, markdown code blocks, math overflow and structured Solve cards were repaired. Completed Solve answers no longer render their serialized text a second time above the steps. Step explanations, cancellation, retry and comprehension actions retain their existing contracts. Review keeps reveal-before-grade behavior and removes progress bars that always displayed zero.

Added the missing root Radix TooltipProvider, which previously caused collapsed navigation and progress legends to throw. Tooltip content renders through a portal to avoid sidebar clipping. Source forms and icon actions have accessible labels; the workspace has a skip link. The settings link labelled as a README but pointing to the home screen was removed.

## Verification

| Check | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS; repeated after final narrow-form edits |
| `pnpm test` | 120 PASS, 2 opt-in live SKIPPED; 17 files passed, 1 skipped |
| `pnpm exec vitest run tests/frontend` after final edits | 56 PASS, 10 files |
| `pnpm build` after final edits | PASS, production compilation, TypeScript and prerendering |
| Staged whitespace check | PASS |

Three new regressions exercise the actual Tailwind compiler with the application's global CSS, the actual root provider with collapsed navigation/progress tooltips, and completed Solve rendering without duplicate content. Existing frontend, backend and synthetic transport integration checks remain covered. The complete suite ran before the last presentation-only source-reference/grade-button/timezone adjustments; the frontend suite and lint were repeated afterward. The final build includes those adjustments.

Browser screenshots, computed layout and interactive desktop/narrow checks have **not run**. The previous localhost browser permission rejection remains unresolved, and no alternate browser, CDP, shell or indirect browser workaround was attempted. Static layout review, SSR checks and a successful build are not evidence of visual fidelity or interactive behavior. Real Supabase cookies/RLS/persistence and live Nemotron generation remain unverified, as recorded in the integration handoff.

## Preserved state and next check

No packages, lockfile, public contracts, database schema or backend implementation changed. The original kit, mockup and decode helpers are preserved. Worker checkouts and worker Boards remain unchanged; no replacement worker was created. The existing local dev process was left alone. Its pre-existing generated `next-env.d.ts` development imports are preserved outside the UI commit.

The root remains **INTEGRATING**. Once browser access is available, compare the application and original mockup at 1440×900, 768px and 375px widths. Exercise expanded/collapsed navigation, page actions, dialogs, chat with context panel and source input, Solve follow-up, practice feedback, reveal/grade, search and keyboard focus. Configure live services separately before claiming the persisted product journey or model quality is verified.
