# Backlog

## Overview

This file tracks the current state of work, improvements, and technical debt for Songbook-OC.

## Format

- **Status**: pending | in_progress | completed | cancelled
- **Priority**: high | medium | low

## Items

### Add Definition of Done and Decision Logging

- **Status**: completed
- **Priority**: high
- **Description**: Added DoD to AGENTS.md with tests, commit, docs requirements. Added AI-facing documentation section. Created BACKLOG.md.
- **Related**: 4991e76

### Fix lint configuration issues

- **Status**: completed
- **Priority**: high
- **Description**: Fixed ESLint config to use typescript-eslint properly, added browser globals, disabled overly strict Svelte rules, fixed unused variable warnings.
- **Related**: 842cb6a

### Add users, authentication, and ownership (phase 1)

- **Status**: completed
- **Priority**: high
- **Description**: Added User/Invite/Collaboration schema. Configured Auth.js with Credentials + Google OAuth. Created /setup page for first admin user and /login page. Added auth guards and ownership filters to all Song/Songbook routes.
- **Related**: This commit

### Invite system (phase 2)

- **Status**: pending
- **Priority**: high
- **Description**: Admin UI to send invites. Email verification flow. Signup via invite token.

### Collaboration & ownership transfer UI

- **Status**: pending
- **Priority**: medium
- **Description**: UI for adding collaborators, transferring ownership (single + bulk), viewing forked-from attribution.

### Fork songs and songbooks

- **Status**: pending
- **Priority**: medium
- **Description**: API + UI for forking a song/songbook. Show forked-from reference.

---

_Update this file on each commit per the Definition of Done._
