---
review_date: 2026-06-24
scope: full-repo
commit: HEAD (post-fix)
baseline: [PLANNING.md, AGENTS.md]
verdict: approve
score: 8.5/10
---

# REVIEW.md — Shylv Manager Bot Discord

## Executive Summary

The bot is functional, well-structured, and follows its contract files closely after the v0.5.1 fix pass. The codebase is lean (~15 files), conventions are consistent, and the layered architecture (Command → Query → DB) is respected. All three High-severity findings from the initial audit have been resolved. Counts — 🔴 0 · 🟡 0 · 🟢 4 · 🔵 3.

## Verdict & Top Priorities

**Verdict: Approve.** All High issues resolved. Remaining items are Medium/Low.

1. ~~🟡 Move `MASTER_ADMIN_ID` from hardcoded constant to `.env`.~~ ✅ **Fixed in v0.5.1**
2. ~~🟡 Modal submit handler lacks admin permission check.~~ ✅ **Fixed in v0.5.1**
3. ~~🟡 `balance_logs` label logic does not handle `'bonus'` type.~~ ✅ **Fixed in v0.5.1**
4. ~~🟢 Missing `README.md` — referenced by AGENTS.md and PLANNING.md.~~ ✅ **Fixed in v0.5.1**
5. ~~🟢 Help embed is missing `/staff_list` command.~~ ✅ **Fixed in v0.5.1**
6. ~~🟢 `package.json` version (`0.1.0`) out of sync with PLANNING.md (`0.5.1`).~~ ✅ **Fixed in v0.5.1**

## Conformance to Contract

### PLANNING.md — ✅ Aligned (minor drifts)

- Architecture diagram matches code. All 10 commands + Context Menu present.
- Data model matches `schema.sql`. `balance_logs.type` constraint includes `'bonus'`.
- Phase 2.5 roadmap items are all implemented.
- Minor drift: PLANNING.md references `README.md` in `related:` frontmatter and intro, but no `README.md` exists in the repo.

### AGENTS.md — ✅ Mostly aligned (2 minor violations)

- ✅ All "⛔ Never" rules honored: no `.env` committed, no direct DB queries in command files, no silent failures.
- ✅ `createErrorEmbed` used for all user-facing errors.
- ✅ `parseChapters` used for all chapter input (never raw split).
- ✅ Balance updates use dedicated query functions (`addChapterLog`, `addBonusLog`, `addDeduction`).
- ~~⚠️ Violation: AGENTS.md states "No `any` types in feature files" with exception for `index.ts` command registry...~~ ✅ **Fixed in v0.5.1**
- ~~⚠️ Violation: AGENTS.md references `PROMPT_REVIEW.md` for pre-merge review, but no `PROMPT_REVIEW.md` exists in the repo...~~ ✅ **Fixed in v0.5.1**

### DESIGN.md — N/A

No `DESIGN.md` exists. Not applicable — this is a CLI/bot project with no UI.

## Findings by Area

### Security

#### 🟡 High

- ~~**issue (non-blocking)** — `src/utils/staff_cache.ts:13`: `MASTER_ADMIN_ID` is hardcoded...~~ ✅ **Fixed in v0.5.1**

- ~~**issue (non-blocking)** — `src/index.ts:117-174`: The modal submit handler (`log_points_modal_`) does not verify that `interaction.user.id` is an admin before processing...~~ ✅ **Fixed in v0.5.1**

### Correctness & Logic

#### 🟡 High

- ~~**issue (non-blocking)** — `src/utils/embeds.ts:136`: Balance log label logic: `log.type === 'chapter' ? 'chapter log' : log.reason || 'deduction'`...~~ ✅ **Fixed in v0.5.1**

#### 🟢 Medium

- ~~**issue** — `src/utils/embeds.ts:196-253`: The `/help` embed lists all commands but is missing `/staff_list` from the admin section...~~ ✅ **Fixed in v0.5.1**

- ~~**issue** — `src/database/queries.ts:107`: `bonus: 0` is hardcoded when inserting chapter logs...~~ ✅ **Fixed in v0.5.1**

### Architecture & Maintainability

#### 🟢 Medium

- ~~**issue** — `src/index.ts:131-134`: Dynamic `import()` calls inside the modal handler for `parser.js`, `queries.js`, and `embeds.js`...~~ ✅ **Fixed in v0.5.1**

- ~~**issue** — `src/types/index.ts:14-19`: `StaffConfig` interface is used only in `staff_cache.ts` for the in-memory cache...~~ ✅ **Fixed in v0.5.1**

### Documentation & DX

#### 🟢 Medium

- ~~**issue** — Root directory: `README.md` is referenced by AGENTS.md (line 4: "Human docs: README.md") and PLANNING.md (`related: [README.md, ...]`), but does not exist...~~ ✅ **Fixed in v0.5.1**

#### 🔵 Low

- ~~**nitpick** — `package.json:3`: Version is `0.1.0` while PLANNING.md states `0.5.0`.~~ ✅ **Fixed in v0.5.1**

- ~~**nitpick** — `src/utils/staff_cache.ts:10`: Comment fragment: `// In-memory cache: Discord ID// The in-memory cache` — two comments merged on one line.~~ ✅ **Fixed in v0.5.1**

- ~~**nitpick** — `src/commands/deduct.ts:4`: Comment still reads `Usage: /deduct user:@Staff amount:5.00 reason:Pembayaran Juni`...~~ ✅ **Fixed in v0.5.1**

## Strengths

- **praise** — Clean layered architecture consistently followed across all 10+ commands. No command ever touches the database directly — all go through `queries.ts`.
- **praise** — The `parseChapters` utility is robust: handles ranges, deduplication, sorting, size limits, and negative numbers. Well-documented with clear input/output types.
- **praise** — The staff cache pattern (load on boot, update on mutations) is a pragmatic optimization for a small-team bot that avoids unnecessary DB round-trips on every command.
- **praise** — Error handling is thorough — every command has try/catch with proper error embeds, and the global interaction handler in `index.ts` has a fallback catch.
- **praise** — Graceful shutdown handlers for SIGINT/SIGTERM ensure clean Discord gateway disconnection.

## Recommendations / Action Plan

1. ~~**[Add to TASK.md — High]** Add admin check in modal submit handler (`index.ts:118`).~~ ✅ **Fixed**
2. ~~**[Add to TASK.md — High]** Move `MASTER_ADMIN_ID` to `.env`.~~ ✅ **Fixed**
3. ~~**[Add to TASK.md — High]** Fix bonus label logic in `embeds.ts:136`.~~ ✅ **Fixed**
4. ~~**[Add to TASK.md — Medium]** Add `/staff_list` to help embed.~~ ✅ **Fixed**
5. ~~**[Add to TASK.md — Medium]** Create `README.md`.~~ ✅ **Fixed**
6. ~~**[Optional]** Replace dynamic imports in modal handler with static imports.~~ ✅ **Fixed**
7. ~~**[Optional]** Sync `package.json` version with PLANNING.md.~~ ✅ **Fixed**
