# AGENTS.md — Shylv Manager Bot Discord

> Discord DM bot for scanlation team management (Bun + TypeScript + discord.js + Supabase).
> Human docs: [`README.md`](README.md) — Setup and deployment guide.
> Always read [`PLANNING.md`](PLANNING.md) at the start of a new conversation for architecture and scope.
> Before merging, run a review per `PROMPT_REVIEW.md` and resolve all 🔴/🟡 findings.

## Setup & Commands

- `bun install`                      # Install dependencies
- `bun run dev`                      # Start bot in watch mode (development)
- `bun run start`                    # Start bot in production mode
- `bun run register`                 # Register slash commands globally (run once)
- `bun run src/index.ts --dry-run`   # Fast syntax check (since tsc needs extra setup)
- `bun test`                         # Run unit tests (if any)

*Note: Requires Bun v1.x and `.env` file with Discord and Supabase credentials.*

## Architecture & Project Structure

```
Shylv Manager Bot/
├── src/
│   ├── commands/     # Slash command definitions & execution logic
│   ├── config/       # Environment & hardcoded staff list
│   ├── database/     # Supabase client, queries, and schema.sql
│   ├── types/        # Shared TypeScript interfaces
│   ├── utils/        # Embed builders, chapter parsing logic
│   └── index.ts      # Bot entry point, event listeners, command routing
├── start.bat         # Windows launcher
└── package.json      # Bun scripts and dependencies
```

**Data Flow:** Discord DM `->` Command Handler `->` Database Query (Supabase) `->` Embed Reply

## Code Style & Conventions

- **Strict TypeScript:** No `any` types. Define interfaces in `src/types/index.ts`.
- **Environment Variables:** Always access via `src/config/env.ts` (fail-fast validation), never `process.env` directly in feature files.
- **Color Palette:** Use constants in `src/utils/embeds.ts` for embeds (SUCCESS=Green, DEDUCT=Orange, INFO=Blue, ERROR=Red, HELP=Purple).
- **Date Formatting:** Format dates using the helper in `src/utils/embeds.ts` for consistency.
- **Language:** Code/comments in English; User-facing embed text in Indonesian/English mix (per user preference).

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
- Modifying the Supabase database schema (`src/database/schema.sql`).
- Adding new dependencies to `package.json`.
- Changing the hosting strategy (currently local PC).
- Changing the DM workflow (e.g., adding server-based commands).

### ⛔ Never (strictly forbidden)
- Never commit `.env` or any real tokens/keys.
- Never execute database queries directly in the command handler file (always use `src/database/queries.ts`).
- Never delete rows in `chapter_logs` or `balance_logs` unless explicitly requested (append-only by default).
- Never allow a command to fail silently; always return an error embed or log to console.

## 🚨 CRITICAL RULES — Read These First

### Rule 1: ALWAYS sequence balance updates safely

```typescript
// ❌ WRONG — Updating balance without a log, or doing it independently
await supabase.from('staff').update({ balance: newBalance });
await supabase.from('chapter_logs').insert({...});

// ✅ CORRECT — Use the dedicated query function that handles logs and balance together
await addChapterLog({
  staffDiscordId, chapters, point, bonus, loggedByDiscordId
});
```

**Why:** The `balance_logs` and `chapter_logs` tables must stay perfectly in sync with the `staff` table's `balance` column. Direct updates risk creating silent discrepancies.

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
