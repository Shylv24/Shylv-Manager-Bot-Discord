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
4. 🟢 Missing `README.md` — referenced by AGENTS.md and PLANNING.md.
5. 🟢 Help embed is missing `/staff_list` command.
6. 🟢 `package.json` version (`0.1.0`) out of sync with PLANNING.md (`0.5.1`).

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
- ⚠️ Violation: AGENTS.md states "No `any` types in feature files" with exception for `index.ts` command registry. The `index.ts:34` usage is within the documented exception. However, `embeds.ts:57` and `embeds.ts:152` use `import(...)` type expressions inline instead of importing `BonusEmbedData` and `Staff` from `types/index.ts` at the top — inconsistent with the "Define interfaces in `src/types/index.ts`" convention.
- ⚠️ Violation: AGENTS.md references `PROMPT_REVIEW.md` for pre-merge review, but no `PROMPT_REVIEW.md` exists in the repo (it lives in a separate `#PROMPT MASTER` directory outside this project).

### DESIGN.md — N/A

No `DESIGN.md` exists. Not applicable — this is a CLI/bot project with no UI.

## Findings by Area

### Security

#### 🟡 High

- **issue (non-blocking)** — `src/utils/staff_cache.ts:13`: `MASTER_ADMIN_ID` is hardcoded as `'587958693908185108'`. While not a secret per se (Discord IDs are public), hardcoding it means changing the admin requires a code change and redeploy. **Why:** Violates the principle of config-in-env. If the repo is forked or handed off, the new owner must find and edit source code. **Fix:** Move to `.env` as `MASTER_ADMIN_ID`, access via `env.ts`, and update `staff_cache.ts` to use `env.MASTER_ADMIN_ID`.

- **issue (non-blocking)** — `src/index.ts:117-174`: The modal submit handler (`log_points_modal_`) does not verify that `interaction.user.id` is an admin before processing. The context menu command (`context_log.ts`) checks admin permission before showing the modal, but a malicious user could theoretically craft a modal submission with a matching `customId`. **Why:** Authorization bypass — an unauthorized user could log points. **Fix:** Add `isAdmin(interaction.user.id)` check at line 118 before processing the modal data.

### Correctness & Logic

#### 🟡 High

- **issue (non-blocking)** — `src/utils/embeds.ts:136`: Balance log label logic: `log.type === 'chapter' ? 'chapter log' : log.reason || 'deduction'`. This was written before the `'bonus'` type existed. A bonus log would display its `reason` (correct by accident if reason is set), but if reason were ever null, it would fall through to `'deduction'` — misleading. **Why:** Incorrect labeling of bonus transactions in staff stat history. **Fix:** Update to handle all three types explicitly:
  ```typescript
  const label = log.type === 'chapter' ? 'chapter log'
    : log.type === 'bonus' ? (log.reason || 'bonus')
    : (log.reason || 'deduction');
  ```

#### 🟢 Medium

- **issue** — `src/utils/embeds.ts:196-253`: The `/help` embed lists all commands but is missing `/staff_list` from the admin section. **Why:** Admin may not discover the leaderboard feature. **Fix:** Add a field for `/staff_list` in the admin commands section.

- **issue** — `src/database/queries.ts:107`: `bonus: 0` is hardcoded when inserting chapter logs. The `chapter_logs` table still has a `bonus` column in the schema. This column is now dead weight — always 0. **Why:** Confusing schema drift; the column exists but is never meaningfully populated. **Fix:** This is acceptable short-term (backward compatible). For Phase 3, consider removing the `bonus` column from `chapter_logs` via a migration, since bonuses are tracked in `balance_logs` now.

### Architecture & Maintainability

#### 🟢 Medium

- **issue** — `src/index.ts:131-134`: Dynamic `import()` calls inside the modal handler for `parser.js`, `queries.js`, and `embeds.js`. These modules are already statically imported elsewhere in the app and loaded at startup. **Why:** Unnecessary dynamic imports add complexity; they don't provide any lazy-loading benefit since Bun loads everything eagerly. **Fix:** Import at the top of the file with the other static imports.

- **issue** — `src/types/index.ts:14-19`: `StaffConfig` interface is used only in `staff_cache.ts` for the in-memory cache. It duplicates fields from `Staff` but with different property names (`discordId` vs `discord_id`). **Why:** Minor maintenance burden — two interfaces for conceptually the same entity. **Fix:** Low priority. Consider using `Pick<Staff, 'discord_id' | 'discord_username' | 'role'>` directly, or align naming.

### Documentation & DX

#### 🟢 Medium

- **issue** — Root directory: `README.md` is referenced by AGENTS.md (line 4: "Human docs: README.md") and PLANNING.md (`related: [README.md, ...]`), but does not exist. **Why:** New contributors (or the admin themselves after some time) have no setup guide. **Fix:** Create a `README.md` covering: what the bot does, prerequisites (Bun, Discord bot setup, Supabase), `.env` setup, and how to run.

#### 🔵 Low

- **nitpick** — `package.json:3`: Version is `0.1.0` while PLANNING.md states `0.5.0`. **Fix:** Update `package.json` version to match.

- **nitpick** — `src/utils/staff_cache.ts:10`: Comment fragment: `// In-memory cache: Discord ID// The in-memory cache` — two comments merged on one line. **Fix:** Clean up to a single comment.

- **nitpick** — `src/commands/deduct.ts:4`: Comment still reads `Usage: /deduct user:@Staff amount:5.00 reason:Pembayaran Juni` — the Indonesian example was only updated in the `.setDescription()` call but not in the file header comment. **Fix:** Update comment to match.

## Strengths

- **praise** — Clean layered architecture consistently followed across all 10+ commands. No command ever touches the database directly — all go through `queries.ts`.
- **praise** — The `parseChapters` utility is robust: handles ranges, deduplication, sorting, size limits, and negative numbers. Well-documented with clear input/output types.
- **praise** — The staff cache pattern (load on boot, update on mutations) is a pragmatic optimization for a small-team bot that avoids unnecessary DB round-trips on every command.
- **praise** — Error handling is thorough — every command has try/catch with proper error embeds, and the global interaction handler in `index.ts` has a fallback catch.
- **praise** — Graceful shutdown handlers for SIGINT/SIGTERM ensure clean Discord gateway disconnection.

## Recommendations / Action Plan

1. **[Add to TASK.md — High]** Add admin check in modal submit handler (`index.ts:118`).
2. **[Add to TASK.md — High]** Move `MASTER_ADMIN_ID` to `.env`.
3. **[Add to TASK.md — High]** Fix bonus label logic in `embeds.ts:136`.
4. **[Add to TASK.md — Medium]** Add `/staff_list` to help embed.
5. **[Add to TASK.md — Medium]** Create `README.md`.
6. **[Optional]** Replace dynamic imports in modal handler with static imports.
7. **[Optional]** Sync `package.json` version with PLANNING.md.
