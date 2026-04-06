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

### Add production database backup automation

- **Status**: completed
- **Priority**: high
- **Description**: Added a daily user-level systemd timer plus a SQLite-safe backup script for production. Backups now land under `~/songbook-oc/backups/db/` and only retain a new archive when the snapshot content actually changed.
- **Follow-up**: Add off-site replication once the storage target is chosen.

### Unify song create and edit editor UI

- **Status**: completed
- **Priority**: medium
- **Description**: Extracted the song version editor into a shared component so song creation and version editing now use the same text/advanced editor, metadata fields, and live preview.

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

- **Status**: completed
- **Priority**: medium
- **Description**: UI for adding collaborators, transferring ownership (single + bulk), viewing forked-from attribution.
- **Implementation notes**: Added /lib/server/collaborations.ts module with functions for managing collaborators. Updated song detail page to show owner and collaborators, with a "Manage" button for owners to add/remove collaborators and transfer ownership. Forked-from attribution was already displayed.

### Fork songs and songbooks

- **Status**: completed
- **Priority**: medium
- **Description**: API + UI for forking a song/songbook. Show forked-from reference.

## Roadmap

### Email sending infrastructure

- **Status**: completed
- **Priority**: high
- **Description**: Added a central transactional mail service with `sendmail`, `mailgun`, and local `log` transports, plus persisted `EmailDelivery` records for delivery tracking. Invite creation now uses this service and records whether the email was sent, logged locally, or failed.
- **Related**: This commit
- **Follow-up**: Extend the same service to notifications and ownership transfer emails. Password reset and **collaborator-added** (`collaborator_added` template) are implemented.

### Password reset by email

- **Status**: completed
- **Priority**: high
- **Description**: Implemented a secure password reset flow with single-use emailed tokens, hashed token storage, expiry handling, public request/reset pages, and clear invalid, expired, used, and success states. This removes the need for manual admin intervention when users forget passwords.

### User directory

- **Status**: completed
- **Priority**: high
- **Description**: Add a "People" page where users can search for others by name or email and quickly understand who is part of the community. This should become the main entry point for sharing and collaboration without requiring users to remember exact email addresses.
- **Implementation notes**: Added `/people` page with user search and a "Shared with me" section showing songs and songbooks shared with the current user. Navigation link added for all authenticated users.

### Shared with me dashboard

- **Status**: completed
- **Priority**: high
- **Description**: Created a dedicated view at `/shared` listing all songs and songbooks others have shared with the current user, with filters for songs/songbooks and showing owner and role.
- **Implementation notes**: Added `/shared` page with collaboration filter, owner info display, and role badges. Navigation link added in header.

### Grouped navigation submenus

- **Status**: pending
- **Priority**: medium
- **Description**: Group main menu items using submenus (or equivalent nested navigation) with these sections: **Songs**, **Songbooks**, **Community**, **Admin**, and **Impressum**, so the header stays scannable as more links accumulate.

### Sharing management UI with clear roles

- **Status**: completed
- **Priority**: high
- **Description**: Add UI on songs and songbooks to show owner, collaborators, and permission levels in one place. Users should be able to add or remove collaborators, adjust roles, and understand what each role allows without admin help.
- **Implementation notes**: Song and songbook detail pages show owner and collaborators with shared copy (`collaborationUiCopy.ts`) explaining what Editor means, role labels, and links to `/people`. Songbook page loads collaborators in `+page.server.ts` for a visible Sharing section when applicable.

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

- **Status**: in_progress
- **Priority**: low
- **Description**: Show light profile information such as display name, optional team or church note, recent activity presence, and what the user has shared with you. The goal is not social networking, but enough context to make collaboration understandable and human.
- **Progress**: Optional `User.publicBio` (settings + `/people` list/detail, search matches bio). Further items (activity presence, “what they shared with you”) remain open.

### Activity log

- **Status**: completed
- **Priority**: high
- **Description**: Add an activity feed for important events such as create, edit, fork, share, archive, ownership change, and invite acceptance. Shared systems work better when users and admins can answer "what happened?" without guessing.
- **Implementation notes**: Added `ActivityLog` model with `actorId`, `action`, `resourceType`, `resourceId`, `sourceResourceId`, and `sourceResourceType` for tracking forks. Actions include SONG_CREATED, SONG_VERSION_CREATED, SONG_ARCHIVED, SONG_FORKED, SONG_MADE_PUBLIC/PRIVATE, COLLABORATOR_ADDED/REMOVED, OWNERSHIP_TRANSFERRED, INVITE_SENT, INVITE_ACCEPTED. Added activity log server module with `logActivity`, `getActivityLogs`, and `getRecentActivity` functions. Integrated logging into song/songbook creation, versioning, forking, archiving, collaboration changes, invites, and signup. Admins can browse and filter recent rows at `/admin/activity`.

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

- **Status**: completed
- **Priority**: medium
- **Description**: Added `/admin/email-deliveries` so admins can inspect recent transactional email attempts, filter by template or status, and review linked invite/reset context, transport identifiers, metadata, and failure messages.
- **Related**: This commit

### Better search and filtering

- **Status**: completed
- **Priority**: medium
- **Description**: Improve search across titles, lyrics, authors, metadata, and ownership or sharing scope. As the library grows, search quality becomes one of the highest-leverage productivity features for building songbooks quickly.
- **Progress**: `buildSongListWhere` / songs list API `?search=` now match any song version whose title, author, content (lyrics), or metadata JSON string contains the trimmed query (same visibility scope as before). Placeholder on `/songs` updated to reflect the broader fields.

### Tags and categories

- **Status**: in progress
- **Priority**: medium
- **Description**: Support tags like `Christmas`, `Easter`, `Youth`, `Opening`, `Communion`, `German`, or `English`, with filters in song and songbook flows. This matches how churches think about songs and will make collection building much faster.
- **Progress**: Liedermappe import now persists first-class song tags and categories, inferred from source collections plus conservative language/keyword rules. The songs list (`/songs`) supports URL-driven tag and category filters (`?tag=…`, `?category=…`), shows tags/categories on each row, and the songs API accepts the same query params. On the song detail page, owners and collaborators can add or remove tags and categories (creating new labels by name via upsert), and admins get a collapsible library panel to delete a tag or category globally. On a songbook detail page, the **Add Song** modal uses the same tag/category filters (URL `?tag=` / `?category=` on the songbook route), shows label chips on each pickable row, and loads **only songs visible to the current user** (same scope as `/songs`), not every non-archived song in the database. The **songbooks list** (`/songbooks`) and `GET /api/songbooks` support `?tag=` / `?category=` filtered by songs on the **latest** songbook version (`songbookListQuery.ts`).

### Version comparison and recommended versions

- **Status**: done (2026-04-01)
- **Priority**: medium
- **Description**: Show differences between song versions and allow a preferred version to be marked for reuse or printing. This helps teams collaborate without confusion when multiple variants of the same song exist.

### Duplicate detection and metadata quality checks

- **Status**: completed
- **Priority**: low
- **Description**: Warn when newly created songs look very similar to existing ones, and surface missing metadata such as author or copyright before export. These checks reduce long-term library mess and prevent quality issues from accumulating silently.
- **Implementation notes**: Server-side `warnings` on song create (form + `POST /api/songs`), new song version (`POST /api/songs/[id]/versions` and song detail save), and fork (`POST /api/songs/[id]/fork`). Title matching uses normalization (case, diacritics, punctuation) plus Levenshtein similarity against songs visible to the user; new versions exclude the current song id. UI: `SongCreationWarningsBanner` and session flash on `/songs` after create; song detail page already surfaces the same shape from save.

### Song collection presentation generation (overhead / projection PDF)

- **Status**: pending
- **Priority**: high
- **Description**: Deliver a **projection-quality** PDF that is **not** the same procedure as normal songbook generation. Today, "overhead" reuses the same `generated-songs` pipeline as chorded/text-only (`overhead.tex` only switches the `songs` package to `[slides]`), with the same end-of-book clickable TOC as print songbooks. That is **not** adequate for on-screen use.
- **Target behavior** (separate generation path from print songbooks):
  - **One verse or chorus per page** (or slide), tuned for legibility at a distance.
  - **Repeat the chorus** on each appearance even when the printed songbook would not repeat it (projection workflow).
  - **Table of contents on page 1** in a **multi-column** layout (not the same end-of-book TOC block as chorded PDFs).
  - **Navigation**: e.g. a control to jump **back to the start** (PDF link/button or equivalent).
- **Note**: Normal songbooks keep a **single** end-of-book title index with clickable entries (`buildSongbookTocLatex`); presentation output should be explicitly designed, not a thin variant of that flow.

### Configurable songbook output modes (print pipeline)

- **Status**: in_progress
- **Priority**: medium
- **Description**: Baseline exists: `Songbook.outputSettings` JSON drives mode (`chorded` | `text-only` | `overhead`), font size, and paper size; `songbookPdf.ts` picks a template and applies `layout.tex` placeholders. **Gaps vs desired behavior**:
  - **One stored PDF per version today** (`SongbookVersion.pdfPath` → `${version.id}.pdf`): regenerating **overwrites** the file. Chorded and text-only (and any other variant) **cannot coexist** as separate downloads without schema/UI changes.
  - **No live preview** of the chosen configuration before generating.
  - **Limited** font list, paper sizes, and font sizes compared to what we want long term.

### Named export configurations and retained PDF artifacts

- **Status**: pending
- **Priority**: high
- **Description**: Let users **save layout presets independently of a songbook** (named configurations: mode, fonts, paper, sizes, and related options). When generating, pick **a songbook version + a named configuration**, produce the PDF, and **keep it** as a downloadable artifact (so multiple modes or presets for the same songbook can coexist). Include **preview** of the selected configuration (at least before full generation). This replaces the idea of a single implicit `outputSettings` blob on the songbook as the only way to capture "how to print."

### Presentation mode in the app

- **Status**: in_progress
- **Priority**: high
- **Description**: Create a browser-based presentation mode that can open a collection and step through songs cleanly (keyboard navigation, quick jumps via TOC). **Complements** the projection PDF work above: in-browser mode for rehearsals/services without leaving the app; projection PDF remains for venues that prefer a static file or PDF reader.
- **Progress**: `/songbooks/[id]/present` steps through a songbook version’s ordered songs with keyboard navigation and version selection; TOC-style jump list still open.

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

### Validate and clean song input for LaTeX safety

- **Status**: completed
- **Priority**: medium
- **Description**: Validate and normalize song text (and related metadata passed into the PDF pipeline) to reduce LaTeX build failures: encoding issues, unescaped special characters, and other inputs that break `pdflatex` or songmaker output. Prefer clear user-facing validation errors where possible, and conservative sanitization where automatic cleanup is acceptable.
- **Implementation notes**: Added `src/lib/utils/songPdfPipelineSafety.ts` (normalization, structured-header escaping for songmaker, composite validation including replay carets and raw `.sng` `***` rule) plus `src/lib/server/songPdfPipelineGuard.ts` for API enforcement and persisted normalization. Integrated into song create/version/fork API routes (already on branch), `PUT /api/songs/[id]`, preview endpoint, `songbookPdf` via `buildSongContentForPdf`, form actions (already on branch), and `SongVersionEditorForm` notice.

### Editor: replayed-chord (`^`) sanity check

- **Status**: completed
- **Priority**: medium
- **Description**: In the song editor, warn or validate when the number of ChordPro replay markers (`^`) per line or verse does not match what the previous chord line provides (the LaTeX `songs` package errors with “Replayed chord has no matching chord” when `^` is used for syllable breaks like `be^halt` instead of replay). Help users catch this before PDF export.
- **Implementation notes**: Added `validateReplayCarets` in `src/lib/utils/replayCaretValidation.ts` (body lines after `***`, chord-line detection aligned with `sngParser`, strict handling when lines contain `^`). Song create/edit modal (`SongVersionEditorForm`) shows an amber `role="status"` notice with per-line messages. Unit tests cover happy path, `be^halt`, and too-many-carets cases.

## Decisions

**Date**: 2026-04-02
**Context**: Transactional email attempts were already persisted in `EmailDelivery`, but admins still had no operational UI for answering whether an invite or password reset was sent, logged locally, or failed. Support work required direct database access.
**Decision**:

- Add an admin page at `/admin/email-deliveries` that lists the most recent delivery records with status, transport, recipient, related invite or reset context, and parsed metadata such as signup/reset URLs and expiry timestamps.
- Keep filtering simple and server-side at the page layer using recent-record retrieval plus in-memory filtering, which avoids coupling the first operational slice to database-specific search behavior.

**Alternatives considered**:

- Exposing raw `EmailDelivery` rows directly in the page load: rejected because the admin page needs stable display labels and parsed metadata rather than leaking storage format details into the UI.
- Building a broader audit log at the same time: rejected because mail-delivery troubleshooting is already a concrete operational need and can ship independently of the wider audit backlog.

---

**Date**: 2026-04-02
**Context**: The deployment script previously updated code and restarted the production service without applying pending Prisma migrations on the server. That left production vulnerable to code/schema drift after deploys and required a manual migration step.
**Decision**:

- Update `deploy.sh` to run `pnpm prisma migrate deploy` on the server after syncing `.env` and installing dependencies, but before restarting the app.
- Keep production schema changes in checked-in Prisma migrations and continue avoiding `db push` in deploy flows.

**Alternatives considered**:

- Relying on manual production migration commands: rejected because it is easy to forget and can leave production code running against an outdated schema.
- Using `prisma db push` during deploy: rejected because it bypasses the migration history and is explicitly unsafe for this project.

---

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
