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
- **Related**: 13e4d36

### Invite system (phase 2)

- **Status**: completed
- **Priority**: high
- **Description**: Admin API to create invites. Email verification endpoint. Signup page with verify then create account flow. Invite tokens expire after 7 days.
- **Related**: This commit

### Share content when sending an invite

- **Status**: completed
- **Priority**: high
- **Description**: Admin can attach content-sharing grants to an invite. On sign-up, the new user is automatically granted EDITOR access to all songs/songbooks owned by the specified users. Missing/archived resources are silently skipped.
- **Follow-up**: Support sharing _specific_ songs/songbooks (not just "all from owner") — requires a scope field on InviteCollaboration and a multi-select picker in the admin UI.

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
