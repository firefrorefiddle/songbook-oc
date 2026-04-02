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

## Roadmap

### Email sending infrastructure

- **Status**: completed
- **Priority**: high
- **Description**: Added a central transactional mail service with `sendmail`, `mailgun`, and local `log` transports, plus persisted `EmailDelivery` records for delivery tracking. Invite creation now uses this service and records whether the email was sent, logged locally, or failed.
- **Related**: This commit
- **Follow-up**: Extend the same service to password reset, notifications, and ownership transfer emails.

### Password reset by email

- **Status**: completed
- **Priority**: high
- **Description**: Implemented a secure password reset flow with single-use emailed tokens, hashed token storage, expiry handling, public request/reset pages, and clear invalid, expired, used, and success states. This removes the need for manual admin intervention when users forget passwords.

### User directory

- **Status**: pending
- **Priority**: high
- **Description**: Add a "People" page where users can search for others by name or email and quickly understand who is part of the community. This should become the main entry point for sharing and collaboration without requiring users to remember exact email addresses.

### Shared with me dashboard

- **Status**: pending
- **Priority**: high
- **Description**: Create a dedicated view listing all songs and songbooks others have shared with the current user, with filters for recent items, editable items, and owner. Users should not need to search the entire library just to find content that was explicitly shared with them.

### Sharing management UI with clear roles

- **Status**: pending
- **Priority**: high
- **Description**: Add UI on songs and songbooks to show owner, collaborators, and permission levels in one place. Users should be able to add or remove collaborators, adjust roles, and understand what each role allows without admin help.

### Fine-grained sharing for specific songs and songbooks

- **Status**: pending
- **Priority**: high
- **Description**: Extend the collaboration model so users can share individual songs, specific songbooks, or selected content sets rather than only broad owner-level access. This includes the existing follow-up for invite-based sharing of specific songs and songbooks.

### Collaboration roles expansion

- **Status**: pending
- **Priority**: medium
- **Description**: Refine permissions into a clearer model such as `viewer`, `editor`, `manager`, and `owner`. This should support printing without editing, editing without resharing, and delegated management without losing ownership control.

### Ownership transfer and stewardship tools

- **Status**: pending
- **Priority**: medium
- **Description**: Finish ownership transfer for individual items and bulk transfer, with safeguards around accidental changes. The app should support continuity when responsibilities change so content does not get stranded with inactive users.

### Friends and trusted collaborators

- **Status**: pending
- **Priority**: medium
- **Description**: Let users mark frequent collaborators so they appear first in sharing dialogs and directory results. This keeps common workflows fast for church teams where the same people work together regularly.

### Groups

- **Status**: pending
- **Priority**: medium
- **Description**: Add user-managed or admin-managed groups such as "Worship Team", "Youth", or "Tech Team". Groups should reflect how church collaboration works in practice and reduce the amount of repeated sharing setup.

### Group-based sharing

- **Status**: pending
- **Priority**: medium
- **Description**: Allow songs and songbooks to be shared directly with groups instead of only individuals. Membership changes should update access automatically so collaboration stays maintainable as teams change.

### Community profile visibility

- **Status**: pending
- **Priority**: low
- **Description**: Show light profile information such as display name, optional team or church note, recent activity presence, and what the user has shared with you. The goal is not social networking, but enough context to make collaboration understandable and human.

### Activity log

- **Status**: pending
- **Priority**: high
- **Description**: Add an activity feed for important events such as create, edit, fork, share, archive, ownership change, and invite acceptance. Shared systems work better when users and admins can answer "what happened?" without guessing.

### Notifications

- **Status**: pending
- **Priority**: medium
- **Description**: Introduce in-app notifications for collaboration events, with optional email delivery for important actions. Users should be informed when content is shared with them, when access changes, or when a new version appears in content they work on.

### Admin user management

- **Status**: completed
- **Priority**: medium
- **Description**: Provide an admin view for browsing users, deactivating accounts, resending invites, checking verification state, and reviewing collaboration footprint. Even in a trusted internal community, basic operational controls are needed to keep the system healthy.
- **Related**: This commit
- **Implementation notes**: Added `/admin/users` with account status controls, pending invite resend, verification visibility, and ownership/collaboration summaries. User deactivation now blocks sign-in and protected-route access.

### Mail delivery and audit visibility

- **Status**: pending
- **Priority**: medium
- **Description**: Add admin-level visibility into whether system emails were queued, sent, failed, or bounced, and keep audit records for key account and permission events. This is necessary for real support work when users report that they never received an email.

### Better search and filtering

- **Status**: pending
- **Priority**: medium
- **Description**: Improve search across titles, lyrics, authors, metadata, and ownership or sharing scope. As the library grows, search quality becomes one of the highest-leverage productivity features for building songbooks quickly.

### Tags and categories

- **Status**: in progress
- **Priority**: medium
- **Description**: Support tags like `Christmas`, `Easter`, `Youth`, `Opening`, `Communion`, `German`, or `English`, with filters in song and songbook flows. This matches how churches think about songs and will make collection building much faster.
- **Progress**: Liedermappe import now persists first-class song tags and categories, inferred from source collections plus conservative language/keyword rules. Song and songbook filtering UI still needs to be built.

### Version comparison and recommended versions

- **Status**: done (2026-04-01)
- **Priority**: medium
- **Description**: Show differences between song versions and allow a preferred version to be marked for reuse or printing. This helps teams collaborate without confusion when multiple variants of the same song exist.

### Duplicate detection and metadata quality checks

- **Status**: pending
- **Priority**: low
- **Description**: Warn when newly created songs look very similar to existing ones, and surface missing metadata such as author or copyright before export. These checks reduce long-term library mess and prevent quality issues from accumulating silently.

### Song collection presentation generation

- **Status**: pending
- **Priority**: high
- **Description**: Add a new output mode for song collections intended for on-screen presentation using the overhead LaTeX layout and a clickable table of contents at the beginning. This should be optimized for projection use and navigation rather than simply reusing the print flow.

### Presentation mode in the app

- **Status**: pending
- **Priority**: high
- **Description**: Create a browser-based presentation mode that can open a generated collection and step through songs cleanly, ideally with keyboard navigation and quick jumps via the table of contents. This makes the app usable during rehearsals, meetings, and services without leaving the system.

### Presentation-friendly songbook options

- **Status**: pending
- **Priority**: medium
- **Description**: Allow users to choose between print layout and presentation layout when generating a songbook, with settings for chord visibility, font size, and section display. Projection and paper serve different needs, so output should be intentional rather than one-size-fits-all.

### Reusable song collections and setlists

- **Status**: pending
- **Priority**: medium
- **Description**: Let users assemble temporary or reusable collections for events, services, or practice evenings, then print them or present them on screen. This bridges the gap between the raw song library and the actual workflow of preparing content for gatherings.

### Single-community visibility rules cleanup

- **Status**: pending
- **Priority**: medium
- **Description**: Formalize the visibility model around `private`, `shared`, and `community-visible` content so users can understand who can see what. The app should stay a single shared community while still supporting selective collaboration across trusted people.

### Inactive user stewardship

- **Status**: pending
- **Priority**: medium
- **Description**: Add a process for handling inactive users without deleting their history, such as deactivation plus optional ownership reassignment. Church responsibilities change often, and the app should preserve continuity of shared content.

### Community publishing and discoverability

- **Status**: pending
- **Priority**: medium
- **Description**: Allow users to explicitly publish selected songs or songbooks to the wider authenticated community while keeping other items private or selectively shared. This supports the "invite our friends and share songs" model without introducing separate workspaces.

## Decisions

**Date**: 2026-04-02
**Context**: Password reset started failing with a Prisma validation error for `User.isActive` even though the schema already contained the field. The generated client had fallen behind the checked-in schema, so runtime queries could reference valid schema fields that the local client did not know about yet.
**Decision**:

- Add an explicit `pnpm prisma:generate` script and run it automatically before `dev`, `build`, `check`, and test commands.
- Treat Prisma client generation as part of normal app startup and verification, not as a one-time install-only side effect.

**Alternatives considered**:

- Relying on `postinstall` alone: rejected because existing working copies and some deploy/update flows can continue using a stale generated client without reinstalling dependencies.
- Removing `isActive` checks from password reset: rejected because deactivated-account safeguards are intentional and the problem was operational drift, not the query itself.

---

**Date**: 2026-04-01
**Context**: Admin user management needed a first operational slice that could disable accounts safely without bundling the later audit and stewardship backlog items into the same change.
**Decision**:

- Added `isActive` and `deactivatedAt` on `User`.
- Deactivation blocks credential login and rejects deactivated sessions from protected pages and APIs.
- The first admin view at `/admin/users` focuses on browsing users, toggling activation, resending pending invites, checking verification state, and reviewing ownership/collaboration counts.

**Alternatives considered**:

- Login-only deactivation checks: rejected because existing sessions would keep access.
- Folding ownership reassignment and audit history into this change: deferred to dedicated backlog items to keep scope tight.

---

**Date**: 2026-04-01
**Context**: Password resets were still handled manually via a script, even though invite delivery and transactional email tracking already existed. The app needed a self-service flow without leaking which email addresses are registered.
**Decision**:

- Add a dedicated `PasswordResetToken` model with hashed tokens, expiry, and single-use semantics.
- Reuse the transactional email service for reset delivery and `EmailDelivery` auditing instead of creating a separate mail path.
- Make the request screen return a generic success message regardless of whether the email exists, while the reset screen shows explicit invalid, expired, used, and success states once the user follows a link.

**Alternatives considered**:

- Storing raw reset tokens: rejected because a database leak would make outstanding reset links immediately usable.
- Showing request-time errors for unknown email addresses: rejected because it leaks account existence and is unnecessary for the user flow.

---

_Update this file on each commit per the Definition of Done._
