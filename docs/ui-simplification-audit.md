# UI simplification audit (Songbook-OC)

This document reviews the current web UI from several complementary perspectives, names concrete pain points observed in the codebase, and proposes directions for simplification without prescribing a single redesign.

**Scope reviewed:** primary navigation (`+layout.svelte`), list pages (`/songs`, `/songbooks`), detail pages (`/songs/[id]`, `/songbooks/[id]`), collaboration surfaces (`/people`, `/shared`), settings, and representative modals/editors.

---

## 1. Frameworks used (why more than one lens)

A single checklist misses tradeoffs. The sections below combine:

| Lens | What it highlights |
|------|---------------------|
| **Information architecture** | Where users get lost between “places” (routes) and duplicate entry points. |
| **Cognitive load** | How many concepts and controls compete for attention on one screen. |
| **Progressive disclosure** | What should be default vs behind “More”, tabs, or role-gated sections. |
| **Mental models vs implementation** | Whether labels match what users expect (song vs version, sharing, “recommended”). |
| **Heuristic evaluation** (Nielsen-style) | Consistency, error prevention, recognition over recall. |

Together these give overlapping evidence: overload usually scores badly on **cognitive load**, **IA**, and **consistency** at the same time.

---

## 2. Information architecture

### 2.1 Top navigation is broad and flat

The main nav exposes many peers at once: Songs, Songbooks, People, Shared, optional admin links (Users, Invites, Mail, Activity), and Impressum (`src/routes/+layout.svelte`). For casual users, **seven or more top-level items** plus account menu increases scanning cost and obscures the primary workflow (manage songs → assemble songbooks → export/present).

**Opportunities:**

- Group **directory / social** items (People, Shared) under one “Community” or “Sharing” menu, or move secondary items into a user/account menu for non-admins.
- Collapse **admin** into a single “Admin” entry with a hub page instead of four separate global links (Users, Invites, Mail, Activity).
- Consider **home** as a lightweight dashboard (recent songbooks, drafts, shared with me) instead of redirect-only to `/songs` (`src/routes/+page.svelte`).

### 2.2 Duplicate or overlapping destinations

- **“Shared with me”** appears as a dedicated `/shared` route and again as a full section on `/people` (`src/routes/people/+page.svelte`). Users may not know which is canonical or why both exist.

**Opportunity:** One primary place for “content others shared with me” (e.g. `/shared` only), with People focused on **discovery** (search users, open profiles). Link between them instead of duplicating lists.

### 2.3 Legal / footer content in primary nav

**Impressum** in the main bar is common in DACH sites but competes with task navigation for every user on every page.

**Opportunity:** Footer link on authenticated layouts, or under Settings / Help.

---

## 3. Cognitive load

### 3.1 Song detail page is very dense

`/songs/[id]` combines in one long scroll (`src/routes/songs/[id]/+page.svelte`):

- Title, author, fork provenance, owner, collaborators, multiple explanatory blurbs (`collaborationUiCopy`), recommended-version messaging, action buttons (clear default, edit, fork, sharing).
- Metadata grid, full **tags & categories** editing UI.
- Full lyric body in a `<pre>`.
- Optional **admin** global tag/category library inside `<details>`.
- **Version history** plus **side-by-side comparison** with field diffs and line-level content diff.

This is appropriate for power users but heavy for “open song → read / quick edit.”

**Opportunities:**

- **Tabs or anchors:** Overview | Edit | Versions | Sharing (and Taxonomy under Edit or Overview).
- **Progressive disclosure:** Show comparison only when `versions.length > 1` *and* user expands “Compare versions” (already partially gated by version count).
- **Reduce repeated copy:** Owner/collaborator blurbs repeat near the header; consolidate into one short “Access” strip with a single “Learn more” link.

### 3.2 Songbook detail header is action-heavy

`/songbooks/[id]` places many actions in one row (`src/routes/songbooks/[id]/+page.svelte`): Present, Generate PDF, Download PDF (with timestamp), View Log, Add Song, New Version, Fork, Sharing, Settings.

**Opportunities:**

- **Primary vs secondary:** e.g. “Add song” + “Generate / Download” as primary; Present, Fork, New version, Settings, Log as “More” menu or grouped “Export” submenu.
- **PDF cluster:** Single “PDF” dropdown: Generate, Download, View log (last build), reducing four buttons to one entry point.

### 3.3 List filters repeat the same pattern

Songs and songbooks list pages use search + tag + category + Apply + archived (`src/routes/songs/+page.svelte`, `src/routes/songbooks/+page.svelte`). Tag/category changes apply on `change`, but search needs Enter or Apply—**mixed models** increase mistakes (“I typed but nothing happened”).

**Opportunities:**

- Auto-apply search after debounce, or make Apply the only apply path consistently.
- On mobile, collapse filters behind “Filters” sheet.

---

## 4. Mental models and language

### 4.1 Song vs song version

The product correctly separates **Song** (entity) and **SongVersion** (content revisions). The UI often surfaces “latest” in the title while also discussing “recommended” and “draft”—clear for insiders, easy to misread for newcomers.

**Opportunities:**

- Near the H1, a single line: **“Showing: Latest draft”** or **“Showing: Recommended (for printing)”** with a link to switch view, instead of multiple paragraphs.
- In lists, the amber “Using a recommended version instead of the newest draft” line (`src/routes/songs/+page.svelte`) is helpful; consider shortening to **“Print version differs from latest”** with tooltip for detail.

### 4.2 Collaboration roles

`collaborationUiCopy` explains Editor vs Admin and that Admin ≈ Editor for now (`src/lib/collaborationUiCopy.ts`). Exposing **Admin** in the collaborator role dropdown while the copy says they are the same forces users to reason about future permissions.

**Opportunity:** Single collaborator role until differentiated, or hide Admin behind advanced/owner-only with explanation.

### 4.3 “Archive” vs user vocabulary

Archiving is implemented and copy uses “Archive”; ensure empty states and destructive confirmations use the same term everywhere (list pages already say “Archive” in modals).

---

## 5. Consistency and recognition

### 5.1 Button and color language

- Settings uses **blue** primary buttons (`src/routes/settings/+page.svelte`); much of the app uses **indigo**. Unify for recognition.
- **People** search uses a raw `<button>`; songs/songbooks use shared `Button`. Harmonize components.

### 5.2 Fork flows

Songbook fork uses `prompt()` (`src/routes/songbooks/+page.svelte`); song fork uses a modal. **Same action, different UI** reduces predictability.

**Opportunity:** One modal pattern for both, with validation and consistent error display.

### 5.3 View vs row click

List rows are links; **View** duplicates navigation. Helpful for discoverability but adds noise.

**Opportunity:** Rely on row click only, or make **View** a visually quieter text link.

---

## 6. Editor and preview complexity

`SongVersionEditorForm` bundles simple fields, optional advanced editor, metadata, PDF pipeline notices, and PNG preview (`src/lib/components/SongVersionEditorForm.svelte`). This is powerful but busy.

**Opportunities:**

- Wizard step: **Content** → **Metadata** → **Preview**, or collapsible “Print preview” panel.
- Default **simple** editor; “Advanced” clearly labeled for ChordPro-heavy workflows.

---

## 7. Admin surfaces

Admin user management already uses a structured page with search and metrics (`src/routes/admin/users/+page.svelte`). Other admin areas are separate top-nav items; a **single admin dashboard** with cards (Users, Invites, Email deliveries, Activity) would reduce global clutter without removing capability.

---

## 8. Prioritized recommendations (impact vs effort)

| Priority | Change | Rationale |
|----------|--------|-----------|
| **High** | Reduce top-nav items (group admin, move Impressum, consider merging Shared into one IA path) | Cuts noise on every screen. |
| **High** | Split song detail into sections/tabs (Overview / Versions / Access) | Largest single-page cognitive win. |
| **High** | Cluster songbook actions (PDF menu, More menu) | Reduces header button overload. |
| **Medium** | Unify filter apply behavior + debounced search | Fewer “broken” expectations on list pages. |
| **Medium** | Deduplicate “Shared with me” between People and /shared | Clearer mental model. |
| **Medium** | One fork UX (modal, no `prompt`) | Consistency. |
| **Lower** | Align Settings styling with app indigo/Button | Polish. |
| **Lower** | Simplify collaborator role UI until Admin differs | Less conceptual overhead. |

---

## 9. How to validate changes

After redesigns, validate with:

- **First-time task tests:** Create song → add to songbook → generate PDF → present.
- **Collaboration path:** Find user → share songbook → accept/edit as collaborator (if applicable).
- **Return-user path:** Find song by lyric search, open, compare versions.

Qualitative **think-aloud** sessions (3–5 users) are enough to catch IA and wording issues that metrics miss.

---

## 10. Summary

The UI implements a rich domain (versions, recommendations, collaboration, PDF pipeline, presentation mode). The main usability issues are **breadth of navigation**, **duplicate sharing entry points**, **single-page density** on song and songbook detail, and **inconsistent micro-patterns** (filters, fork, styling). Addressing navigation grouping and progressive disclosure on detail pages would yield the largest gains in perceived simplicity without removing features.
