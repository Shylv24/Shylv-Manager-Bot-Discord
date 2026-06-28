---
status: active
version: 0.6.0
last_updated: 2026-06-28
owners: [Agung Prasetyo (solo-dev / admin)]
related: [README.md, AGENTS.md, TASK.md]
---

# PLANNING.md — Shylv Manager Bot Discord

> A Discord DM-based bot for scanlation team management: tracking completed chapters and managing staff balance/payment records. Status: Phase 2.5 (Command Refactor & Dashboard). Read this first.
> Human docs: README.md • Agent rules: AGENTS.md • Tasks: TASK.md

## Vision & Problem

Scanlation teams lack a simple, centralized way to track which chapters have been completed by each staff member and how much balance (payment/credit) they have accumulated. Current workflows rely on manual spreadsheets or informal messages, leading to lost records, disputes, and administrative overhead.

**Target users:** A scanlation team admin who manages staff payments/credits via Discord DMs. Staff members who want to check their own records.

**Value proposition:** A Discord bot that lives in DMs, allowing the admin to log completed chapters and automatically calculate accumulated balance (points and separate bonuses), while giving staff members self-service access to view their own stats and history. The bot provides an auditable, always-available record that both parties can reference.

## Scope & Success Metrics

### In-scope (Phase 1 & 2)
- Users can self-register as staff dynamically via `/reg`, and admin can remove staff via `/staff_remove`
- Admin can delete logs and reset balances via `/clear_logs`
- Admin can log completed chapters via `/point` command (single, range, comma-separated)
- Admin can add bonuses via `/bonus` command (separate from chapter points)
- Admin can deduct balance via `/deduct` command with mandatory reason
- Admin can use **User Context Menu** (`Right-click → Apps → Log Points`) for automatic user targeting in DMs (opens a Modal)
- Admin can view all active staff leaderboard via `/staff_list`
- Automatic balance calculation: `balance += point` per `/point`; bonus added separately via `/bonus`
- Staff can view their own stats via `/staff_stat` (ephemeral/private by default); admin has `public` toggle
- Bot responds with informative, compact embed messages optimized for mobile
- Full balance history tracking (additions from chapters, bonuses, and deductions)
- Persistent data storage in local SQLite database
- Bot runs locally on admin's PC (no cloud hosting needed)

### Non-goals (explicitly NOT doing)
- Server-based commands (all interactions are DM-only or User App contexts)
- Multi-project/multi-comic support (structure will be prepared but not exposed)
- Web dashboard or UI
- Payment gateway integration
- Self-registration of admin roles (admin role must be assigned directly in database)
- Role-based access beyond admin/staff
- Notification/reminder system

### Success Metrics
- Admin can log chapters and see updated balance in < 5 seconds response time
- Staff can query their stats and get accurate, up-to-date information
- Bot is available whenever admin's PC is running
- Zero data loss on chapter records

## Architecture

```
[Discord User DM] <---> [Discord API (Gateway WebSocket)]
                              |
                     [Shylv Bot (Bun + TypeScript)]
                     [Running on Admin's Local PC]
                              |
                     [discord.js library]
                              |
                     [Command Handler + Modal Handler]
                    /    |      |       |      |      |      \        \
           /point  /bonus  /deduct  /staff_stat  /help  /reg  /clear_logs  /staff_list
           (admin) (admin) (admin)   (all)       (all)  (all) (admin)      (admin)
                              |
                     [Context Menu: "Log Points" (admin) → Modal]
                              |
                     [SQLite Database]
                     (local file: ./data/shylv.db)
```

**Pattern:** Simple layered architecture — Command Layer → Service Layer → Data Layer. Chosen for simplicity; the bot is a single long-running process with no need for microservices or event queues.

**Data flow (admin logs chapter via `/point`):**
1. Admin sends `/point user:@staff chapters:1-5 point:1.5` in DM to bot
2. Bot validates admin role, parses chapter input (range → [1,2,3,4,5])
3. Bot inserts chapter records into SQLite `chapter_logs` table
4. Bot calculates balance addition: `1.5 × 5 chapters = 7.50`
5. Bot updates user's `balance` in `staff` table
6. Bot replies with embed: chapters logged, point/ch, total added, new balance

**Data flow (admin logs chapter via Context Menu):**
1. Admin right-clicks staff profile in DM → Apps → "Log Points"
2. Bot shows a Modal popup (chapters, point, note fields)
3. Same processing as `/point` above, but target user is auto-detected

**Data flow (staff checks stats):**
1. Staff sends `/staff_stat` in DM to bot
2. Bot looks up user by Discord ID in `staff` table
3. Bot queries `chapter_logs` for that user
4. Bot replies with embed: total chapters, total balance, last activity date, recent chapter list

## Technology Stack

| Layer | Choice | Version | Why / Alternative rejected |
|---|---|---|---|
| Runtime | Bun | latest | Fast, built-in TypeScript support, lightweight; Node.js rejected (heavier, needs ts-node/tsx) |
| Language | TypeScript | 5.x | Type safety for command parsing and data models; plain JS rejected (runtime errors in parsing logic) |
| Discord Library | discord.js | 14.x | Most mature, best docs, slash command support; Eris rejected (less maintained) |
| Database | SQLite (bun:sqlite) | built-in | Zero config, no network dependency, data lives with bot; Supabase rejected (unnecessary cloud dependency for local bot) |
| DB Client | bun:sqlite | built-in | Bun's native SQLite module, zero external deps, synchronous, transaction-safe |
| Hosting | Local PC (Windows) | — | Free, always available while PC is on; Railway rejected (free tier expires), Render rejected (sleeps after 15min idle) |

### Key Dependencies
- `discord.js` — Discord API interaction, slash commands, embeds
- `bun:sqlite` — Built-in SQLite database module (synchronous, transaction-safe, zero dependencies)


### Required Services
- Discord Bot Application (via Discord Developer Portal)

## Constraints & Assumptions

### Constraints
- **Budget: $0** — All services must be on free tiers
- **Local hosting:** Bot runs on admin's PC; PC must be on for bot to respond. Data stored locally in SQLite file.
- **No external database dependency:** SQLite file at `./data/shylv.db` — zero network latency, zero cloud costs
- **Shared server required:** Admin, staff, and bot must share at least one Discord server for DM commands to work
- **DM-only interaction:** All commands run in direct messages, not in servers
- **Self-registration as staff only:** Users register via `/reg` (always staff role). Admin role promotion is done directly in the database for security
- **Master Admin:** The initial admin Discord ID is configured via `MASTER_ADMIN_ID` in `.env` (never hardcoded in source)

### Assumptions
- Staff team is small (< 20 members) — SQLite handles this easily
- One user = one active project/comic for now (multi-project structure prepared in DB but not exposed in commands)
- Admin is the bot owner / a single designated person
- Chapter numbers are positive integers
- Point and bonus values are non-negative decimal numbers (dot separator: 1.5)

## Conventions & Patterns

- **Project structure:** Feature-based folders (`src/commands/`, `src/database/`, `src/types/`, `src/config/`, `src/utils/`)
- **Command registration:** Discord slash commands registered globally (DM-compatible)
- **Error handling:** All commands return user-friendly error embeds; errors logged to console
- **Config:** Environment variables for secrets (bot token); hardcoded user list in `src/config/staff.ts`
- **Naming:** camelCase for variables/functions, PascalCase for types/interfaces, UPPER_SNAKE for constants
- **Embeds:** All bot responses use Discord embeds for clean, structured display

Enforcement details will live in AGENTS.md.

## Data Model

### `staff` table
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID generated via `crypto.randomUUID()` |
| discord_id | TEXT (unique) | Discord user ID |
| discord_username | TEXT | Display name for logging |
| role | TEXT | 'admin' or 'staff' |
| is_active | INTEGER | 1 if currently active staff, 0 if removed |
| balance | REAL | Accumulated balance (point + bonus) |
| created_at | TEXT | ISO 8601 registration date |
| updated_at | TEXT | ISO 8601 last modification |

### `chapter_logs` table
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID generated via `crypto.randomUUID()` |
| staff_id | TEXT (FK → staff.id) | Who completed the chapters |
| chapters | TEXT | JSON-encoded array of chapter numbers (e.g., `"[1,2,3]"`) |
| point | REAL | Point value for this entry |
| bonus | REAL | Bonus value for this entry |
| total_added | REAL | point + bonus (denormalized for quick display) |
| note | TEXT | Optional note/context |
| logged_by | TEXT (FK → staff.id) | Admin who logged this entry |
| created_at | TEXT | ISO 8601 timestamp |

### `balance_logs` table
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | UUID generated via `crypto.randomUUID()` |
| staff_id | TEXT (FK → staff.id) | Whose balance changed |
| amount | REAL | Change amount (+positive or -negative) |
| type | TEXT | 'chapter', 'deduct', or 'bonus' |
| reason | TEXT | Required for deductions/bonuses, optional for chapters |
| reference_id | TEXT (FK → chapter_logs.id) | Links to chapter_logs when type='chapter' |
| logged_by | TEXT (FK → staff.id) | Admin who made the change |
| created_at | TEXT | ISO 8601 timestamp |

### Relationships
- `staff` 1 ←→ N `chapter_logs` (via staff_id)
- `staff` 1 ←→ N `balance_logs` (via staff_id)
- `chapter_logs.logged_by` → `staff.id` (admin who created the record)
- `balance_logs.reference_id` → `chapter_logs.id` (optional link)

### Future-ready fields (not exposed yet)
- `project_id` can be added to `chapter_logs` for multi-project support

## External Integrations & APIs

| Integration | Purpose | Auth | Failure handling |
|---|---|---|---|
| Discord API | Bot gateway + slash commands | Bot token (env var) | Reconnect on disconnect; log errors |

## Roadmap / Milestones

- [x] Phase 1 — Foundation: Project setup, Discord bot connection, database schema, `/point`, `/deduct`, `/staff_stat`, `/help` commands working in DM.
- [x] Phase 2 — Polish: Dynamic staff management via self-registration (`/reg`), admin removal (`/staff_remove`), deleting past records (`/clear_logs`), User Apps integration (usable everywhere).
- [x] Phase 2.5 — Refactor & Dashboard: Separated `/bonus` from `/point`, added Context Menu "Log Points" with Modal, added `/staff_list` leaderboard, mobile-optimized embeds, ephemeral visibility controls, all text in English.
- [x] Phase 2.6 — SQLite Migration: Migrated from Supabase PostgreSQL to local SQLite via bun:sqlite. Removed cloud dependency. All balance operations use transactions for atomicity.
- [ ] Phase 3 — Multi-project: Add project/comic title support, per-project balance tracking, project-scoped stats. **Done when:** admin can assign chapters to specific comic titles.
- [ ] Phase 4 — Advanced: Export data (CSV), monthly summaries. **Done when:** admin can export records and view summaries.

## Risks, Mitigations & Technical Debt

| Risk | Likelihood/Impact | Mitigation |
|---|---|---|
| PC downtime = bot offline + data inaccessible | Medium/Medium | Data stored locally; recommend periodic manual backup of `data/shylv.db` |
| SQLite file corruption | Low/High | WAL mode enabled for crash resilience; periodic backups recommended |
| Bot token leaked | Low/Critical | Store in env vars only; never commit to repo |
| Data loss from disk failure | Low/High | Recommend copying `data/shylv.db` to external storage periodically |

| Debt | Why it exists | Payoff plan |
|---|---|---|
| `any` type used for command registry Map | Needed to support both ChatInput and ContextMenu commands | Refactor with union type or overloaded handler |
| No multi-project support | Not needed yet, team works on one project | Phase 3: add project entity |
| Query functions are async but SQLite is sync | Kept async signatures for drop-in replacement from Supabase migration | Can refactor to sync when convenient |

## Open Questions & Decision Changelog

### Open Questions
- **[Resolved]** Balance deductions: Implemented via `/deduct` command with mandatory reason.
- **[Resolved]** Database: Migrated from Supabase to SQLite for zero-dependency local operation.
- **[Non-blocking]** Should the bot support editing/deleting past chapter records? (Admin correction feature)
- **[Non-blocking]** Should the bot send periodic summary DMs to staff (weekly/monthly)?

### Changelog
| Date | Change | Reason |
|---|---|---|
| 2026-06-23 | Initial draft | Project kickoff |
| 2026-06-23 | v0.3.0: Local hosting, /deduct command, balance_logs table | User feedback: Railway not permanent, need deduction tracking |
| 2026-06-24 | v0.5.0: Refactored /ch_done→/point, separated /bonus, added Context Menu "Log Points", /staff_list dashboard, mobile-optimized embeds, English-only text, ephemeral visibility for staff_stat | Command UX improvements and admin dashboard |
| 2026-06-24 | v0.5.1: Moved MASTER_ADMIN_ID to .env, added admin check on modal submit, fixed bonus label in balance history | REVIEW.md audit fixes |
| 2026-06-28 | v0.6.0: Migrated from Supabase PostgreSQL to local SQLite (better-sqlite3). Removed cloud dependency. All balance operations use transactions. | Eliminate cloud dependency, simplify setup, zero-cost operation |
