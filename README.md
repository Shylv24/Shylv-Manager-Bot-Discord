# Shylv Manager Bot

A Discord DM-based bot for scanlation team management. It allows admins to log completed chapters, add bonuses, and deduct balances while automatically tracking staff point balances in a local SQLite database.

## Features

- **DM-First Interaction:** All slash commands are executed privately in Direct Messages or via User Apps.
- **Chapter Logging:** Log multiple chapters at once (e.g., `1-5`, `8,10`).
- **Balance Calculation:** Automatically calculates balance based on points per chapter.
- **Separate Bonus/Deduct Tracking:** Track non-chapter bonuses and deductions with required reasons.
- **Leaderboard & Stats:** Admins can view a leaderboard (`/staff_list`), and staff can check their own stats (`/staff_stat`).
- **Context Menu:** Right-click a user -> Apps -> "Log Points" to easily open a logging modal without typing their username.
- **Zero Cloud Dependency:** All data stored locally in SQLite — no external database service required.

## Prerequisites

- [Bun](https://bun.sh/) v1.x or later
- A Discord Bot Application (Create one at the [Discord Developer Portal](https://discord.com/developers/applications))

## Setup & Installation

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   bun install
   ```
3. **Environment Variables:**
   Copy `.env.example` (if exists) or create a new `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_bot_client_id_here
   MASTER_ADMIN_ID=your_discord_user_id
   ```
4. **Database:** No manual setup required! The SQLite database is automatically created at `./data/shylv.db` on first bot startup.

## Running the Bot

**Development Mode (Hot-reload):**
```bash
bun run dev
```

**Production Mode:**
```bash
bun run start
```

## Registering Commands

Before using the bot for the first time, you must register the slash commands and context menus with Discord's API:
```bash
bun run register
```

## Backup

The database file is stored at `./data/shylv.db`. To back up your data, simply copy this file to a safe location periodically.

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Discord Library: discord.js
- Database: SQLite (bun:sqlite — built-in)

## Documentation

- `PLANNING.md`: Architecture and scope.
- `AGENTS.md`: AI agent boundaries and conventions.
- `REVIEW.md`: The latest audit report of the codebase.
