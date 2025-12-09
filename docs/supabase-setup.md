# Supabase Setup Guide

This guide explains how to set up and link your Supabase project to run database migrations.

## Prerequisites

- Node.js `>=20.10.0` installed
- A Supabase project created at [supabase.com](https://supabase.com)
- Your Supabase project reference ID and database password

## Setup Steps

### 1. Login to Supabase CLI

Authenticate with your Supabase account:

```bash
npx supabase login
```

This command will open your browser automatically for authentication. Follow the login process in the browser.

### 2. Link Your Project

Link your local project to your Supabase project using the project reference:

```bash
npx supabase link --project-ref momjlqhhapbaigjwociq
```

**Note:** Replace `momjlqhhapbaigjwociq` with your actual Supabase project reference ID if different.

You will be prompted to enter your database password. This is the password you set when creating your Supabase project.

### 3. Apply Migrations

Once linked, push your SQL migrations to the remote database:

```bash
npx supabase db push
```

This command will:
- Show all pending migrations
- Ask for confirmation before applying
- Execute all migration files in `supabase/migrations/` directory
- Apply them in chronological order (by filename timestamp)

## Migration Files

All migration files are located in `supabase/migrations/` and follow the naming convention:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Example: `20250108000000_create_players_table.sql`

Migrations are applied in alphabetical order, so ensure your timestamps reflect the correct sequence.

## Troubleshooting

### "Cannot find project ref"

Make sure you've run `npx supabase link` first before pushing migrations.

### "relation does not exist"

Ensure all dependent tables are created in earlier migrations. Check migration file timestamps to ensure proper order.

### "Authentication failed"

Verify your database password is correct. You can reset it in Supabase Dashboard > Settings > Database.

## Additional Commands

### Check migration status

```bash
npx supabase migration list
```

### Reset local Supabase link

```bash
npx supabase unlink
```

Then run `npx supabase link` again to re-link.

## Notes

- The project reference ID (`momjlqhhapbaigjwociq`) is extracted from your Supabase project URL
- After linking, migrations will automatically apply with `npx supabase db push`
- Never commit your `.env` file with real credentials
- Each migration should be in its own file and will auto-apply via `supabase db push`
