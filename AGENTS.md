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

## Commands
- install: `pnpm install`
- dev: `pnpm dev`
- test: `pnpm test`
- lint: `pnpm lint`
- format: `pnpm format`

## Architecture rules
- Keep server and UI logic separate.
- Put DB access behind repository/service functions.
- No business logic in UI components.
- Prefer small pure functions where possible.

## Quality rules
- TypeScript strict mode.
- Add validation for every form.
- Add at least one happy-path test for each CRUD operation.
- Do not introduce new dependencies unless justified.
- Before finishing, run lint and tests and fix failures.

## Code Style Guidelines

### General Principles

- Keep functions small and focused (single responsibility)
- Use meaningful variable and function names
- Write comments that explain *why*, not *what*
- Handle errors explicitly and gracefully
- Write tests for all new functionality

### TypeScript/JavaScript

**Imports**
- Group by: external imports, internal imports, relative imports
- Alphabetize within groups
- Use named exports, avoid default exports for utilities

```typescript
// Correct
import { useState } from 'react';
import { SongCard } from '@/components/SongCard';
import { formatKey } from './utils';

// Wrong
const myComponent = require('./myComponent');
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
