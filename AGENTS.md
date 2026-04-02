# AGENTS.md

Instructions for agents working in this repository.

## Project Overview

Songbook-OC is a songbook management application. CRUD for songbooks, songbook-version, songs, song-versions and for songs.
A song is unique, but can have multiple versions. Each version is created by a specific user. Users can fork each others song-versions.
Equally, Songbooks are comprised of songs, optionally pinned to specific versions. Users can also fork each others songbooks, and give
each other rights to modify their songs and songbooks.

## Songbook processing

Songs are simple text files in a special format that can be converted to LaTeX with a custom command. LaTeX scaffolding will be used
to convert songbooks to PDF, and also for simple previews of songs.

## Stack

- Frontend: SvelteKit + TypeScript
- Backend: same app, server routes
- DB: SQLite with Prisma
- Styling: Tailwind
- Package manager: pnpm

## Songmaker CLI

The songmaker-cli tool converts .sng files to LaTeX. It's installed at `/home/mike/.cabal/bin/songmaker-cli`.

### Invocation Methods

1. **File argument**: `songmaker-cli /path/to/song.sng`
2. **stdin/stdout**: `echo "content" | songmaker-cli`

When called with a file path, songmaker reads the .sng file and produces a corresponding .tex file in the same directory.

### .sng Format

The .sng format consists of a header section followed by a `***` separator, then the chordpro content:

```
title: Song Title
author: Author Name (optional)
copyright: Copyright info (optional)
reference: (optional, leave empty or omit)
***
<chordpro content here>
```

**Important**: The header MUST include `title:` and the `***` separator. Without a title, songmaker will fail with "song has no title on songmaker import".

Example:

```
title: Psalm 150
author: Bernd Draffehn
copyright: 1981 SCM Hänssler
reference:
***
C          F             C            d G
Halleluja, lobet Gott in seinem Heiligt-um,
C                D            F G
lobet ihn in der Feste seiner M-acht!
```

### Metadata Storage

Song metadata (copyright, etc.) is stored in the SongVersion.metadata JSON field. When generating PDFs, extract this and format properly:

```typescript
function buildSongContent(
  title: string,
  content: string,
  author?: string | null,
  copyright?: string,
): string {
  if (content.trim().startsWith("title:")) {
    return content; // Already in .sng format
  }
  let sngContent = `title: ${title}\n`;
  if (author?.trim()) {
    sngContent += `author: ${author}\n`;
  }
  if (copyright?.trim()) {
    sngContent += `copyright: ${copyright}\n`;
  }
  sngContent += "reference:\n";
  sngContent += "***\n";
  sngContent += content;
  return sngContent;
}
```

## LaTeX Environment

### Required Packages

The project uses these LaTeX packages (ensure texlive-full is installed):

- `songs` - For chorded song formatting
- `scrbook` - KOMA-Script book class
- `DejaVuSans` - Font for chord printing
- `mathpazo` - Palatino font for text
- `pdfpages` - For including PDF pages
- `babel` with `ngerman` - German language support

### Template Files

Located in `src/lib/server/latex/`:

- `layout.tex` - Document class and page setup
- `font.tex` - Font configuration and song formatting
- `songs.sty` - Song package (from seed_data)
- `chorded.tex` - Main template for songbook PDFs
- `single-song.tex` - Template for single song previews

### PDF Generation Process

1. Create a temporary directory in `tmp/`
2. Copy LaTeX templates to temp dir
3. For each song in the songbook:
   - Build .sng content with proper header
   - Run `songmaker-cli` to convert to LaTeX
   - Read the generated .tex file
4. Combine all song LaTeX into `generated-songs.tex`
5. Run `pdflatex` twice (first run creates index, second includes it)
6. Copy output PDF to `tmp/output/`
7. Clean up temp directory

### pdflatex Requirements

- Must run pdflatex **twice** for proper table of contents/index generation
- Use `-interaction=batchmode` for non-interactive runs
- Always specify `-output-directory=` to keep temp files contained

Example:

```typescript
await execAsync(
  `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
  { cwd: tempDir },
);
await execAsync(
  `pdflatex -interaction=batchmode -output-directory=${tempDir} ${texPath}`,
  { cwd: tempDir },
);
```

## Seed Data Reference

The seed data in `seed_data/` contains the .sng files and LaTeX templates:

- `lieder/*.sng` - Source song files
- `tex/chorded.tex` - Chorded template
- `tex/songs.sty` - Songs package
- `tex/layout.tex` - Document layout
- `tex/font.tex` - Font configuration

Use seed_data as reference for:

- Correct .sng file format
- LaTeX template structure
- Package requirements

## Commands

- install: `pnpm install`
- dev: `pnpm dev`
- test: `pnpm test`
- lint: `pnpm lint`
- format: `pnpm format`

## Database Workflow (CRITICAL)

### ALWAYS use migrations, NEVER use db push

**Never run `pnpm db:push`** - it will wipe your database and lose all data!

When you change the schema, create a migration instead:

```bash
# Create migration (will prompt for name)
pnpm prisma migrate dev --name <migration_name>

# Or apply pending migrations without prompting
pnpm prisma migrate dev
```

### Why this matters

- `db push` - DANGER: pushes schema directly, drops tables if needed, **destroys data**
- `migrate dev` - SAFE: creates/applies migrations, preserves existing data
- `migrate deploy` - SAFE: applies migrations only (used in production)

### Workflow for schema changes

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma migrate dev --name <descriptive_name>`
3. Verify migration SQL looks correct
4. Test that data is preserved

### Recovering from a wiped database

If you accidentally run `db:push` and lose data, you can often recover:

1. Check if there's a backup: `git stash` may have uncommitted db files
2. The production database (`prisma/prod.db`) may have recent data - sync from there
3. If you had run migrations before the wipe, you may be able to reset the dev db state

### Verifying migration status

```bash
# Check current dev DB status
DATABASE_URL="file:./dev.db" pnpm prisma migrate status

# Check specific DB
DATABASE_URL="file:./prisma/prod.db" pnpm prisma migrate status
```

## Architecture rules

- Keep server and UI logic separate.
- Put DB access behind repository/service functions.
- No business logic in UI components.
- Prefer small pure functions where possible.

## Quality rules

- TypeScript strict mode.
- Add validation for every form.
- Add at least one happy-path test for each CRUD operation.
- Test corner cases in addition to happy paths.
- Do not introduce new dependencies unless justified.
- Before finishing, run lint and tests and fix failures.

### Definition of Done

Every feature or fix must have:

1. **Tests**: Happy-path + corner cases for each CRUD operation + all new functionality
2. **Lint & TypeScript**: Run `pnpm lint` and `pnpm check` (or `pnpm test`), fix any failures
3. **Commit**: Create a commit with proper format: `type(scope): description` (e.g., `feat(songs): add chord transposition`)
4. **Documentation**:
   - Inline code comments explaining _why_, not _what_
   - Update user-facing docs (README.md) if applicable
   - Document decisions in the Decisions section below
5. **Backlog**: Update BACKLOG.md to reflect the change (mark complete, add follow-ups)

### AI-Facing Documentation (Decisions)

Every architectural choice, tradeoff, or context that would be lost over time must be documented in this section. This ensures continuity when picking up work later.

#### Decision Log

<!-- Add new decisions here in the format:
**Date**: YYYY-MM-DD
**Context**: Brief description of the problem or situation
**Decision**: What was decided and why
**Alternatives considered**: Other options that were rejected and why
-->

---

**Date**: 2026-04-01
**Context**: Liedermappe import needed to preserve song taxonomy from the legacy source material without blocking on the full filtering UI. The app also needed a structure that can support future filtering instead of burying labels in free-form JSON metadata.
**Decision**:

- Store song tags and categories as first-class relational data on `Song`, not inside `SongVersion.metadata`.
- During Liedermappe import, derive categories from the existing collection `.tex` files and derive a conservative starter set of tags from language and worship-related keywords.
- Keep the inference logic in a pure shared module so both import scripts and tests use the same rules.

**Alternatives considered**:

- Putting tags/categories into `SongVersion.metadata`: rejected because filters and deduplication become awkward and version-specific taxonomy would create noise for a song-level concept.
- Waiting for the full filtering UI before importing taxonomy: rejected because the legacy source already contains enough structure to preserve now, and delaying import would lose that signal.

---

**Date**: 2026-04-01
**Context**: The app needed a reusable email-sending foundation for invites first, with password reset and notifications planned next. The solution had to work without committing to a third-party mail SDK and still provide delivery visibility for support.
**Decision**:

- Add a central server-side email module with two transports: `sendmail` for real delivery and `log` for development/local fallback.
- Persist every transactional email attempt in a dedicated `EmailDelivery` table so invite-related delivery state is inspectable and reusable for future mail flows.
- Start integration with invite creation first, using absolute signup URLs based on `APP_BASE_URL` or the current request origin.

**Alternatives considered**:

- Introducing a provider-specific SDK immediately: rejected because it would hard-code infrastructure choices too early.
- Keeping invite links manual only: rejected because password reset and future notifications also need a real email abstraction and delivery tracking.

---

**Date**: 2026-04-01
**Context**: Multiple song versions can exist at once, but songbook assembly previously defaulted to the newest version everywhere. Teams needed a stable way to keep a vetted version in reuse while still allowing newer drafts to be explored and compared.
**Decision**:

- Store the preferred reusable version on `Song.recommendedVersionId` instead of an `isRecommended` flag on `SongVersion`.
- Keep recommendation selection explicit. Creating a new version does not automatically replace the recommendation.
- Treat the recommended version as the default choice when reusing songs in songbooks, while preserving already pinned songbook entries.
- Show comparison against the latest version in the song detail page with field-level and line-level diff output to make review practical before changing the recommendation.

**Alternatives considered**:

- Boolean flag on `SongVersion`: rejected because enforcing one recommended version per song would be harder and less clear.
- Automatically recommending the newest version: rejected because it defeats the purpose of keeping a vetted printable version stable while drafts continue.

**Date**: 2026-03-31
**Context**: Adding users, authentication, and ownership to the application. Needed to decide on auth mechanism, invite flow, ownership/collaboration model, and visibility rules.
**Decision**:

- Auth via Auth.js with two providers: Email+Password (credentials) and Google OAuth.
- Invite-only registration: only admins can send invites. Invite tokens expire after 7 days. Invited user must verify their email before the invite is consumable. Token is single-use.
- One owner per Song/Songbook. Owner can add collaborators (with edit access) or transfer ownership (original owner auto-becomes collaborator). Bulk transfer across all songs is also supported.
- Fork = independent copy of a song/songbook, owned by the forking user. `forkedFromId` tracks the original for attribution.
- All content (including "public") requires login. Public = visible to all authenticated users. Private = owner + collaborators only.
- First admin user is created via a `/setup` page that is only accessible when zero users exist (no email verification required for the bootstrap user).

**Alternatives considered**:

- Magic links: simpler but requires email infra from day one; credentials + Google is a better bootstrap path.
- Multiple owners: increases complexity without clear benefit over the collaborator model.
- Public without login: rejected to keep the user base known and controlled.

---

#### Auth.js Integration Notes

- Package: `@auth/sveltekit`
- Providers: `Credentials` (bcrypt password hash), `Google`
- Session strategy: JWT (SQLite has no session table overhead)
- `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` must be set in `.env`
- Hooks file: `src/hooks.server.ts` exposes `handle` from Auth.js
- Session available in server load functions via `event.locals.auth()`

#### User & Ownership Schema Summary

```
User        – id, email, name, passwordHash, role (USER|ADMIN), createdAt
Invite      – id, email, token, role, expiresAt, usedAt, sentById, userId, emailVerifiedAt
Song        – + ownerId, isPublic, forkedFromId
Songbook    – + ownerId, isPublic, forkedFromId
Collaboration – id, userId, songId?, songbookId?, role (EDITOR|ADMIN)
```

## Code Style Guidelines

### General Principles

- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names
- Write comments that explain _why_, not _what_
- Handle errors explicitly and gracefully
- Write tests for all new functionality

### TypeScript/JavaScript

**Imports**

- Group by: external imports, internal imports, relative imports
- Alphabetize within groups
- Use named exports, avoid default exports for utilities

```typescript
// Correct
import { useState } from "react";
import { SongCard } from "@/components/SongCard";
import { formatKey } from "./utils";

// Wrong
const myComponent = require("./myComponent");
```

**Formatting**

- 2 spaces for indentation
- Single quotes for strings
- Semicolons at end of statements
- Trailing commas in multiline structures
- Line length: 100 characters

**Types**

- Use `interface` for object shapes
- Use `type` for unions, intersections, aliases
- Never use `any` - use `unknown` when type is unclear
- Prefer `const` over `let`

```typescript
// Correct
interface Song {
  id: string;
  title: string;
  artist: string;
  chords: Chord[];
}

// Wrong
interface Song {
  id: any;
  title: any;
}
```

**Naming**

- `camelCase` for variables and functions
- `PascalCase` for classes, components, interfaces
- `SCREAMING_SNAKE_CASE` for constants
- Prefix boolean variables with `is`, `has`, `should`

### Error Handling

- Always handle promise rejections
- Use try/catch for async operations
- Return errors as part of the result, don't just throw

```typescript
// Correct
const result = await fetchSong(id);
if (!result.ok) {
  return { error: result.error };
}

// Wrong
try {
  await fetchSong(id);
} catch (e) {
  console.log("error");
}
```

### Git Conventions

- Commit message format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commits atomic (one logical change per commit)
- Reference issues in commit messages: `fix(#123): ...`

```bash
# Good commit messages
feat(songs): add chord transposition feature
fix(import): handle malformed chord notation
docs(readme): update installation instructions

# Bad commit messages
fixed stuff
WIP
asdf
```
