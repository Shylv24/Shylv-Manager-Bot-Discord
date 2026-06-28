# AGENTS.md — Shylv Manager Bot Discord

> Discord bot for scanlation team management (DM & Server compatible) (Bun + TypeScript + discord.js + SQLite).
> **Read [`../../SYSTEM.md`](../../SYSTEM.md)** — shared PC/agent topology.
> Human docs: [`README.md`](README.md) — Setup and deployment guide.
> Always read [`PLANNING.md`](PLANNING.md) at the start of a new conversation for architecture and scope.
> Before merging, run a review per `../../#PROMPT MASTER/PROMPT_REVIEW.md` and resolve all 🔴/🟡 findings.

## Setup & Commands

- `bun install`                      # Install dependencies
- `bun run dev`                      # Start bot in watch mode (development)
- `bun run start`                    # Start bot in production mode
- `bun run register`                 # Register slash commands globally (run once)
- `bun run src/index.ts --dry-run`   # Fast syntax check (since tsc needs extra setup)
- `bun test`                         # Run unit tests (if any)

*Note: Requires Bun v1.x and `.env` file with Discord credentials and Master Admin ID.*

## Repository & Local Paths

| Item | Value |
|------|-------|
| **GitHub** | https://github.com/Shylv24/Shylv-Manager-Bot-Discord |
| **Local path** | `D:\Shylv Projects\Dev\Bot\Shylv Manager Bot Discord` |
| **Junction** | `C:\script\Bot\Shylv Manager Bot Discord` |

## Architecture & Project Structure

```
Shylv Manager Bot/
├── src/
│   ├── commands/     # Slash commands, context menu, and registration script
│   │   ├── point.ts         # /point — Log chapters (admin)
│   │   ├── bonus.ts         # /bonus — Add bonus balance (admin)
│   │   ├── deduct.ts        # /deduct — Deduct balance (admin)
│   │   ├── staff_stat.ts    # /staff_stat — View stats (all, ephemeral for staff)
│   │   ├── staff_list.ts    # /staff_list — Leaderboard dashboard (admin)
│   │   ├── staff_remove.ts  # /staff_remove — Deactivate staff (admin)
│   │   ├── clear_logs.ts    # /clear_logs — Wipe logs (admin)
│   │   ├── staff_add.ts     # /staff_add — Add staff or admin (admin)
│   │   ├── help.ts          # /help — Show command list (all)
│   │   ├── context_log.ts   # Context Menu "Log Points" + Modal (admin)
│   │   └── register.ts      # Script to push commands to Discord API
│   ├── config/       # Environment validation
│   ├── database/     # SQLite client, queries, and schema.sql
│   │   ├── sqlite.ts        # SQLite singleton (init, getDb, close)
│   │   ├── queries.ts       # All database query functions
│   │   └── schema.sql       # Schema reference (auto-run by sqlite.ts)
│   ├── types/        # Shared TypeScript interfaces
│   ├── utils/        # Embed builders, chapter parser, staff cache
│   └── index.ts      # Bot entry point, event listeners, command routing, modal handler
├── data/             # SQLite database files (gitignored)
│   └── shylv.db      # Auto-created on first run
├── start.bat         # Windows launcher
└── package.json      # Bun scripts and dependencies
```

**Data Flow:** Discord DM/Server `->` Command Handler `->` Database Query (SQLite) `->` Embed Reply

## Code Style & Conventions

- **Strict TypeScript:** No `any` types in feature files. Define interfaces in `src/types/index.ts`. (Exception: command registry Map in `index.ts` uses `any` to support both ChatInput and ContextMenu commands.)
- **Environment Variables:** Always access via `src/config/env.ts` (fail-fast validation), never `process.env` directly in feature files. Required vars: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `MASTER_ADMIN_ID`.
- **Color Palette:** Use constants in `src/utils/embeds.ts` for embeds (SUCCESS=Green, DEDUCT=Orange, INFO=Blue, ERROR=Red, HELP=Purple).
- **Date Formatting:** Format dates using the helper in `src/utils/embeds.ts` for consistency.
- **Language:** Code/comments in English; User-facing embed text in English.
- **Embed Layout:** Keep embed descriptions compact (no blank lines, combine related fields with `|` separator) for optimal mobile display.
- **Visibility:** Staff responses are always ephemeral. Admin responses default to ephemeral but can be toggled with `public` option where applicable.

## Testing

- We use `bun test` for unit testing (built-in).
- Focus tests on pure functions like the chapter parser (`src/utils/parser.ts`).
- Mock database calls when testing command logic.

## Git Workflow & Commit

- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`.
- Ensure `bun run start` executes without immediate crashes before committing.

## Boundaries

### ✅ Always (do without asking)
- Update `PLANNING.md` if the architecture, data model, or hosting strategy changes.
- Read `PLANNING.md` at the start of every new conversation.
- Handle all edge cases in `parseChapters` (negative numbers, decimals, huge ranges).
- Use `createErrorEmbed` for all user-facing errors.

### ⚠️ Ask First (confirm first — high-impact)
- Modifying the SQLite database schema (`src/database/schema.sql` and `src/database/sqlite.ts`).
- Adding new dependencies to `package.json`.
- Changing the hosting strategy (currently local PC).
- Changing the command context workflow (e.g., restricting to specific server types).

### ⛔ Never (strictly forbidden)
- Never commit `.env` or any real tokens/keys.
- Never commit `data/` directory (contains SQLite database).
- Never execute database queries directly in the command handler file (always use `src/database/queries.ts`).
- Never delete rows in `chapter_logs` or `balance_logs` unless explicitly requested (append-only by default).
- Never allow a command to fail silently; always return an error embed or log to console.

## 🚨 CRITICAL RULES — Read These First

### Rule 1: ALWAYS sequence balance updates safely (use transactions)

```typescript
// ❌ WRONG — Updating balance without a transaction
db.prepare('UPDATE staff SET balance = ? WHERE id = ?').run(newBalance, staffId);
db.prepare('INSERT INTO chapter_logs ...').run(...);

// ✅ CORRECT — Use the dedicated query function that wraps in a transaction
await addChapterLog({
  staffDiscordId, chapters, point, loggedByDiscordId
});
// Or for bonuses:
await addBonusLog({
  staffDiscordId, amount, reason, loggedByDiscordId
});
```

**Why:** The `balance_logs` and `chapter_logs` tables must stay perfectly in sync with the `staff` table's `balance` column. All balance mutations use `db.transaction()` for atomicity.

### Rule 2: NEVER trust raw user chapter input

```typescript
// ❌ WRONG — Blindly splitting string input
const chapters = interaction.options.getString('chapters').split(',');

// ✅ CORRECT — Use the parser utility
const parseResult = parseChapters(chaptersInput);
if (!parseResult.success) {
    return interaction.reply({ embeds: [createErrorEmbed(parseResult.error)] });
}
const chapters = parseResult.chapters;
```

**Why:** Users will input ranges ("1-5"), spaces, negatives, or trailing commas. The parser handles deduplication, sorting, range expansion, and validation.

### Rule 3: Balance log types must use valid enum values

```typescript
// Valid types for balance_logs.type:
// 'chapter' — from /point command
// 'bonus'   — from /bonus command  
// 'deduct'  — from /deduct command
```

**Why:** The database has a CHECK constraint `type IN ('chapter', 'deduct', 'bonus')`. Using any other value will cause a database error.

### Rule 4: Chapters are stored as JSON strings in SQLite

```typescript
// ❌ WRONG — Treating chapters as native array
db.prepare('INSERT INTO chapter_logs (chapters) VALUES (?)').run([1, 2, 3]);

// ✅ CORRECT — Serialize as JSON string
db.prepare('INSERT INTO chapter_logs (chapters) VALUES (?)').run(JSON.stringify([1, 2, 3]));
// And parse on read:
const chapters = JSON.parse(row.chapters);
```

**Why:** SQLite doesn't support array types. Chapters are stored as JSON text and parsed back to `number[]` in the query layer.
