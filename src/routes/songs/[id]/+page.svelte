<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import type { ActionResult } from "@sveltejs/kit";
  import { onMount } from "svelte";
  import {
    collaborationUiCopy,
    collaboratorRoleLabel,
  } from "$lib/collaborationUiCopy";
  import SongCreationWarningsBanner from "$lib/components/SongCreationWarningsBanner.svelte";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import SongVersionEditorForm from "$lib/components/SongVersionEditorForm.svelte";
  import {
    SONG_CREATE_WARNINGS_SESSION_KEY,
    type SongCreationWarning,
  } from "$lib/songCreationWarnings";
  import {
    compareSongVersions,
    getPreferredSongVersion,
    parseSongMetadata,
  } from "$lib/songVersions";

  let { data, form } = $props();

  let latestVersion = $derived(data.song.versions[0] ?? null);
  let defaultCompareVersionId = $derived(
    data.song.recommendedVersionId &&
      data.song.recommendedVersionId !== latestVersion?.id
      ? data.song.recommendedVersionId
      : data.song.versions[1]?.id || "",
  );
  let showEditModal = $state(false);
  let editingVersion = $state<(typeof data.song.versions)[number] | null>(null);
  let editTitle = $state("");
  let editAuthor = $state("");
  let editContent = $state("");
  let editMetadata = $state<Record<string, string>>({});
  let compareVersionId = $state("");
  let showForkModal = $state(false);
  let forkTitle = $state("");
  let isForking = $state(false);
  let showCollabModal = $state(false);
  let selectedUserId = $state("");
  let selectedRole = $state<"EDITOR" | "ADMIN">("EDITOR");
  let availableUsers = $state<{ id: string; displayName: string; email: string }[]>([]);
  let pageWarnings = $state<SongCreationWarning[]>([]);

  onMount(() => {
    try {
      const raw = sessionStorage.getItem(SONG_CREATE_WARNINGS_SESSION_KEY);
      if (raw) {
        sessionStorage.removeItem(SONG_CREATE_WARNINGS_SESSION_KEY);
        pageWarnings = JSON.parse(raw) as SongCreationWarning[];
      }
    } catch {
      /* ignore corrupt storage */
    }
  });

  async function openCollabModal() {
    const response = await fetch("?/loadUsers", { method: "POST" });
    const result = await response.json();
    if (result.type === "success") {
      availableUsers = result.data.users.filter(
        (u: { id: string }) =>
          u.id !== data.owner.id &&
          !data.collaborators.some((c: { id: string }) => c.id === u.id),
      );
    }
    showCollabModal = true;
  }

  $effect(() => {
    if (!compareVersionId || !data.song.versions.some((version) => version.id === compareVersionId)) {
      compareVersionId = defaultCompareVersionId;
    }
  });

  function getLatestVersion() {
    return latestVersion;
  }

  function getRecommendedVersion() {
    return getPreferredSongVersion(data.song);
  }

  function getComparedVersion() {
    return (
      data.song.versions.find((version) => version.id === compareVersionId) ??
      null
    );
  }

  function getComparison() {
    const latestVersion = getLatestVersion();
    const comparedVersion = getComparedVersion();

    if (
      !latestVersion ||
      !comparedVersion ||
      latestVersion.id === comparedVersion.id
    ) {
      return null;
    }

    return compareSongVersions(latestVersion, comparedVersion);
  }

  function isRecommended(versionId: string) {
    return data.song.recommendedVersionId === versionId;
  }

  function refreshOnSuccess(closeModal = false) {
    return async ({ result }: { result: ActionResult }) => {
      if (
        result.type === "success" &&
        result.data &&
        typeof result.data === "object" &&
        "warnings" in result.data
      ) {
        const w = (result.data as { warnings?: unknown }).warnings;
        if (Array.isArray(w)) {
          pageWarnings = w as SongCreationWarning[];
        }
      }
      if (result.type === "success") {
        if (closeModal) {
          showEditModal = false;
        }
        await invalidateAll();
      }
    };
  }

  function openEdit(versionIndex: number) {
    editingVersion = data.song.versions[versionIndex];
    const parsed = parseSongMetadata(editingVersion.metadata);
    editTitle = editingVersion.title;
    editAuthor = editingVersion.author || "";
    editContent = editingVersion.content;
    editMetadata = parsed;
    showEditModal = true;
  }

  function openFork() {
    forkTitle = getLatestVersion()?.title || "";
    showForkModal = true;
  }

  async function submitFork() {
    isForking = true;
    try {
      const response = await fetch(`/api/songs/${data.song.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: forkTitle }),
      });
      if (!response.ok) {
        throw new Error("Failed to fork song");
      }
      const payload = (await response.json()) as {
        song?: { id: string };
        id?: string;
        warnings?: SongCreationWarning[];
      };
      const forkedSong = payload.song ?? (payload as { id: string });
      if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
        sessionStorage.setItem(
          SONG_CREATE_WARNINGS_SESSION_KEY,
          JSON.stringify(payload.warnings),
        );
      }
      window.location.href = `/songs/${forkedSong.id}`;
    } catch (e) {
      console.error("Fork error:", e);
      isForking = false;
    }
  }
</script>

<svelte:head>
  <title>{getLatestVersion()?.title || "Song"} - Songbook</title>
</svelte:head>

<div class="mb-6">
  <a href="/songs" class="text-indigo-600 hover:text-indigo-800 text-sm"
    >&larr; Back to Songs</a
  >
</div>

<SongCreationWarningsBanner
  warnings={pageWarnings}
  onDismiss={() => (pageWarnings = [])}
/>

{#if data.song.isArchived}
  <div class="mb-4 rounded-md bg-gray-100 p-3 text-gray-700">
    This song is archived
  </div>
{/if}

<div class="bg-white shadow rounded-lg overflow-hidden">
  <div class="px-6 py-4 border-b flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        {getLatestVersion()?.title || "Untitled"}
      </h1>
      {#if getLatestVersion()?.author}
        <p class="text-gray-500">{getLatestVersion()?.author}</p>
      {/if}
{#if (data.song as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
{@const forked = (data.song as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
<p class="mt-1 text-sm text-gray-500">
Forked from <a href="/songs/{forked!.id}" class="text-indigo-600 hover:text-indigo-800">{forked!.versions[0]?.title || 'original'}</a
>
</p>
{/if}
<p class="mt-1 text-sm text-gray-500">
<span class="font-medium text-gray-700">Owner:</span>
<span class="ml-1">{data.owner.displayName}</span>
<span class="text-gray-500"> ({data.owner.email})</span>
</p>
<p class="mt-0.5 text-xs text-gray-500">{collaborationUiCopy.ownerBlurb}</p>
{#if data.collaborators.length > 0}
<p class="mt-1 text-sm text-gray-500">
<span class="font-medium text-gray-700">Collaborators</span>
<span class="sr-only">shared access</span>:
{data.collaborators.map((c) => `${c.displayName} (${collaboratorRoleLabel(c.role)})`).join(", ")}
</p>
<p class="mt-0.5 text-xs text-gray-500">{collaborationUiCopy.editorSongBlurb}</p>
{/if}
{#if data.canEditSong && !data.isOwner}
<p class="mt-2 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900" role="status">
You are a collaborator on this song with editing access. Only the owner can change who else can access it.
<a href="/people" class="ml-1 text-indigo-700 underline">{collaborationUiCopy.findPeopleLinkText}</a>
</p>
{/if}
{#if data.isOwner || !data.canEditSong}
<p class="mt-1 text-xs text-gray-500">
<a href="/people" class="text-indigo-600 hover:text-indigo-800 underline">{collaborationUiCopy.findPeopleLinkText}</a>
</p>
{/if}
      {#if getRecommendedVersion()}
        <p class="mt-2 text-sm text-gray-600">
          Recommended for reuse and songbook printing:
          <span class="font-medium text-gray-900"
            >{getRecommendedVersion()?.title}</span
          >
          ({new Date(getRecommendedVersion()!.createdAt).toLocaleDateString()})
        </p>
      {/if}
    </div>
    <div class="flex gap-2">
      {#if getLatestVersion() && data.song.recommendedVersionId !== getLatestVersion()!.id}
        <form
          method="POST"
          action="?/clearRecommended"
          use:enhance={() => refreshOnSuccess()}
        >
          <Button variant="secondary" type="submit"
            >Use Latest by Default</Button
          >
        </form>
      {/if}
<Button onclick={() => openEdit(0)}>Edit Current Version</Button>
  <Button variant="secondary" onclick={openFork}>Fork</Button>
  {#if data.isOwner}
    <Button variant="secondary" onclick={openCollabModal}>Sharing</Button>
  {/if}
    </div>
  </div>

  {#if getLatestVersion()}
    {@const metadata = parseSongMetadata(getLatestVersion()!.metadata)}
    <div class="px-6 py-4 border-b bg-gray-50">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Created:</span>
          <span class="ml-1"
            >{new Date(
              getLatestVersion()!.createdAt,
            ).toLocaleDateString()}</span
          >
        </div>
        <div>
          <span class="text-gray-500">Status:</span>
          <span class="ml-1"
            >{isRecommended(getLatestVersion()!.id)
              ? "Recommended"
              : "Latest draft"}</span
          >
        </div>
        {#each Object.entries(metadata) as [key, value]}
          {#if value}
            <div>
              <span class="text-gray-500">{key}:</span>
              <span class="ml-1">{value}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <div class="px-6 py-4 border-b border-gray-200 bg-white">
    <h2 class="text-sm font-semibold text-gray-900 mb-2">Tags &amp; categories</h2>
    {#if form?.taxonomyError}
      <p class="mb-3 text-sm text-red-600" role="alert">{form.taxonomyError}</p>
    {/if}
    <div class="flex flex-wrap gap-4 mb-4">
      <div class="min-w-[10rem] flex-1">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Tags
        </p>
        <div class="flex flex-wrap gap-1 min-h-[1.75rem]">
          {#each [...data.song.tags].sort((a, b) => a.tag.name.localeCompare(b.tag.name)) as row (row.tagId)}
            <span
              class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-900"
            >
              {row.tag.name}
              {#if data.canEditSong}
                <form
                  method="POST"
                  action="?/removeSongTag"
                  class="inline"
                  use:enhance={() => refreshOnSuccess()}
                >
                  <input type="hidden" name="tagId" value={row.tagId} />
                  <button
                    type="submit"
                    class="rounded p-0.5 hover:bg-indigo-100 text-indigo-700"
                    title="Remove tag from this song"
                    aria-label="Remove tag {row.tag.name}"
                  >&times;</button>
                </form>
              {/if}
            </span>
          {:else}
            <span class="text-sm text-gray-400">None</span>
          {/each}
        </div>
      </div>
      <div class="min-w-[10rem] flex-1">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Categories
        </p>
        <div class="flex flex-wrap gap-1 min-h-[1.75rem]">
          {#each [...data.song.categories].sort((a, b) =>
            a.category.name.localeCompare(b.category.name),
          ) as row (row.categoryId)}
            <span
              class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-900"
            >
              {row.category.name}
              {#if data.canEditSong}
                <form
                  method="POST"
                  action="?/removeSongCategory"
                  class="inline"
                  use:enhance={() => refreshOnSuccess()}
                >
                  <input type="hidden" name="categoryId" value={row.categoryId} />
                  <button
                    type="submit"
                    class="rounded p-0.5 hover:bg-emerald-100 text-emerald-800"
                    title="Remove category from this song"
                    aria-label="Remove category {row.category.name}"
                  >&times;</button>
                </form>
              {/if}
            </span>
          {:else}
            <span class="text-sm text-gray-400">None</span>
          {/each}
        </div>
      </div>
    </div>
    {#if data.canEditSong}
      <div class="grid gap-4 sm:grid-cols-2">
        <form
          method="POST"
          action="?/addSongTag"
          class="flex flex-col gap-2"
          use:enhance={() => refreshOnSuccess()}
        >
          <label for="new-tag" class="text-sm text-gray-700">Add tag</label>
          <div class="flex gap-2">
            <input
              id="new-tag"
              name="name"
              type="text"
              list="song-tag-suggestions"
              autocomplete="off"
              placeholder="Existing or new tag name"
              class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary">Add</Button>
          </div>
          <datalist id="song-tag-suggestions">
            {#each data.allTags as t (t.id)}
              <option value={t.name}></option>
            {/each}
          </datalist>
        </form>
        <form
          method="POST"
          action="?/addSongCategory"
          class="flex flex-col gap-2"
          use:enhance={() => refreshOnSuccess()}
        >
          <label for="new-cat" class="text-sm text-gray-700">Add category</label>
          <div class="flex gap-2">
            <input
              id="new-cat"
              name="name"
              type="text"
              list="song-category-suggestions"
              autocomplete="off"
              placeholder="Existing or new category name"
              class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary">Add</Button>
          </div>
          <datalist id="song-category-suggestions">
            {#each data.allCategories as c (c.id)}
              <option value={c.name}></option>
            {/each}
          </datalist>
        </form>
      </div>
    {:else}
      <p class="text-sm text-gray-500">
        Only the owner and collaborators can change tags and categories.
      </p>
    {/if}
  </div>

  <div class="px-6 py-4">
    <pre
      class="whitespace-pre-wrap font-mono text-sm text-gray-800">{getLatestVersion()
        ?.content || ""}</pre>
  </div>
</div>

{#if data.isAdmin}
  <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
    <details class="px-6 py-4">
      <summary
        class="cursor-pointer text-sm font-semibold text-gray-900 marker:content-['']"
      >
        Tag &amp; category library (admin)
      </summary>
      <p class="mt-2 text-sm text-gray-600 mb-4">
        Delete a tag or category everywhere it is used. This cannot be undone.
      </p>
      <div class="grid gap-6 md:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase mb-2">All tags</h3>
          {#if data.tagLibrary.length === 0}
            <p class="text-sm text-gray-500">No tags in the library.</p>
          {:else}
            <ul class="divide-y divide-gray-200 border border-gray-200 rounded-md text-sm">
              {#each data.tagLibrary as t (t.id)}
                <li class="flex items-center justify-between gap-2 px-3 py-2">
                  <span class="text-gray-900">{t.name}</span>
                  <span class="text-gray-500 text-xs shrink-0"
                    >{t.songCount} song{t.songCount === 1 ? "" : "s"}</span
                  >
                  <form
                    method="POST"
                    action="?/deleteTagGlobally"
                    class="shrink-0"
                    use:enhance={() => refreshOnSuccess()}
                    onsubmit={(e) => {
                      if (
                        !confirm(
                          `Delete tag "${t.name}" from all songs? This cannot be undone.`,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="tagId" value={t.id} />
                    <Button type="submit" variant="danger">Delete</Button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase mb-2">
            All categories
          </h3>
          {#if data.categoryLibrary.length === 0}
            <p class="text-sm text-gray-500">No categories in the library.</p>
          {:else}
            <ul class="divide-y divide-gray-200 border border-gray-200 rounded-md text-sm">
              {#each data.categoryLibrary as c (c.id)}
                <li class="flex items-center justify-between gap-2 px-3 py-2">
                  <span class="text-gray-900">{c.name}</span>
                  <span class="text-gray-500 text-xs shrink-0"
                    >{c.songCount} song{c.songCount === 1 ? "" : "s"}</span
                  >
                  <form
                    method="POST"
                    action="?/deleteCategoryGlobally"
                    class="shrink-0"
                    use:enhance={() => refreshOnSuccess()}
                    onsubmit={(e) => {
                      if (
                        !confirm(
                          `Delete category "${c.name}" from all songs? This cannot be undone.`,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="categoryId" value={c.id} />
                    <Button type="submit" variant="danger">Delete</Button>
                  </form>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    </details>
  </div>
{/if}

{#if data.song.versions.length > 1}
  <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <ul class="divide-y divide-gray-200">
          {#each data.song.versions.slice(1) as version, i}
            {@const metadata = parseSongMetadata(version.metadata)}
            <li class="px-6 py-4">
              <div class="flex justify-between items-start gap-4">
                <div>
                  <p class="font-medium text-gray-900">
                    {version.title}
                    {#if isRecommended(version.id)}
                      <span
                        class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                      >
                        Recommended
                      </span>
                    {/if}
                  </p>
                  {#if version.author}
                    <p class="text-sm text-gray-500">{version.author}</p>
                  {/if}
                  <p class="text-sm text-gray-400 mt-1">
                    {new Date(version.createdAt).toLocaleDateString()}
                    {#if metadata.copyright}
                      &bull; {metadata.copyright}{/if}
                  </p>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                  <form
                    method="POST"
                    action="?/setRecommended"
                    use:enhance={() => refreshOnSuccess()}
                  >
                    <input type="hidden" name="versionId" value={version.id} />
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isRecommended(version.id)}
                    >
                      {isRecommended(version.id)
                        ? "Recommended"
                        : "Mark Recommended"}
                    </Button>
                  </form>
                  <form
                    method="POST"
                    action="?/deleteVersion"
                    use:enhance={() => refreshOnSuccess()}
                  >
                    <input type="hidden" name="versionId" value={version.id} />
                    <Button variant="danger" type="submit">Delete</Button>
                  </form>
                  <Button variant="secondary" onclick={() => openEdit(i + 1)}
                    >View/Edit</Button
                  >
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">
        Version Comparison
      </h2>
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="border-b bg-gray-50 px-6 py-4">
          <label
            class="block text-sm font-medium text-gray-700"
            for="compare-version"
          >
            Compare the latest version with
          </label>
          <select
            id="compare-version"
            bind:value={compareVersionId}
            class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select an older version</option>
            {#each data.song.versions.slice(1) as version}
              <option value={version.id}>
                {version.title} ({new Date(
                  version.createdAt,
                ).toLocaleDateString()})
              </option>
            {/each}
          </select>
        </div>

        <div class="px-6 py-4">
          {#if !getComparison()}
            <p class="text-sm text-gray-500">
              Choose a version to see what changed.
            </p>
          {:else}
            {#if getComparison()!.fieldDifferences.length > 0}
              <div class="mb-6 space-y-3">
                {#each getComparison()!.fieldDifferences as difference}
                  <div class="rounded-md border border-gray-200 p-3">
                    <p class="text-sm font-medium text-gray-900">
                      {difference.field}
                    </p>
                    <p
                      class="mt-1 text-xs uppercase tracking-wide text-red-700"
                    >
                      Latest
                    </p>
                    <p class="text-sm text-gray-700">
                      {difference.currentValue || "Empty"}
                    </p>
                    <p
                      class="mt-2 text-xs uppercase tracking-wide text-emerald-700"
                    >
                      Compared version
                    </p>
                    <p class="text-sm text-gray-700">
                      {difference.comparedValue || "Empty"}
                    </p>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="rounded-md border border-gray-200 overflow-hidden">
              <div
                class="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Content diff
              </div>
              <div class="max-h-[32rem] overflow-auto font-mono text-sm">
                {#each getComparison()!.contentDifferences as line}
                  <div
                    class:text-gray-500={line.type === "same"}
                    class:bg-red-50={line.type === "removed"}
                    class:text-red-800={line.type === "removed"}
                    class:bg-emerald-50={line.type === "added"}
                    class:text-emerald-800={line.type === "added"}
                    class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 py-1"
                  >
                    <span
                      >{line.type === "removed"
                        ? "-"
                        : line.type === "added"
                          ? "+"
                          : " "}</span
                    >
                    <span class="whitespace-pre-wrap break-words"
                      >{line.value || " "}</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<Modal
  bind:open={showEditModal}
  title="Edit Song Version"
  onclose={() => (showEditModal = false)}
  fullscreen
>
  {#snippet children()}
    <SongVersionEditorForm
      action="?/update"
      error={form?.error}
      bind:title={editTitle}
      bind:author={editAuthor}
      bind:content={editContent}
      bind:metadata={editMetadata}
      submitLabel="Save Version"
      onCancel={() => (showEditModal = false)}
      enhanceSubmit={() => refreshOnSuccess(true)}
    />
  {/snippet}
</Modal>

<Modal bind:open={showForkModal} title="Fork Song" onclose={() => (showForkModal = false)}>
{#snippet children()}
<div class="space-y-4">
<p class="text-sm text-gray-600">
Create a copy of this song that you can edit independently.
</p>
<div>
<label for="fork-title" class="block text-sm font-medium text-gray-700">
New Song Title
</label>
<input
id="fork-title"
type="text"
bind:value={forkTitle}
class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
/>
</div>
<div class="flex justify-end gap-2">
<Button variant="secondary" onclick={() => (showForkModal = false)}>Cancel</Button>
<Button onclick={submitFork} disabled={isForking || !forkTitle.trim()}>
{isForking ? "Forking..." : "Fork Song"}
</Button>
</div>
</div>
{/snippet}
</Modal>

<Modal bind:open={showCollabModal} title="Sharing" onclose={() => (showCollabModal = false)}>
{#snippet children()}
<div class="space-y-6">
<p class="text-sm text-gray-600">{collaborationUiCopy.songSharingModalIntro}</p>
<p class="text-xs text-gray-500">
<a href="/people" class="text-indigo-600 hover:text-indigo-800 underline">{collaborationUiCopy.findPeopleLinkText}</a>
</p>
<div>
<h4 class="text-sm font-medium text-gray-700 mb-2">Owner</h4>
<p class="text-sm text-gray-900">{data.owner.displayName} ({data.owner.email})</p>
<p class="mt-1 text-xs text-gray-500">{collaborationUiCopy.ownerBlurb}</p>
</div>

<div>
<h4 class="text-sm font-medium text-gray-700 mb-2">Collaborators</h4>
<p class="text-xs text-gray-500 mb-2">{collaborationUiCopy.editorSongBlurb} {collaborationUiCopy.adminCollabBlurb}</p>
{#if data.collaborators.length === 0}
<p class="text-sm text-gray-500">No collaborators yet</p>
{:else}
<ul class="divide-y divide-gray-200 border rounded-md">
{#each data.collaborators as collab}
<li class="px-3 py-2 flex justify-between items-center">
<span class="text-sm">{collab.displayName} ({collab.email})</span>
<span class="text-xs text-gray-600 mr-2">{collaboratorRoleLabel(collab.role)}</span>
{#if data.isOwner}
<form method="POST" action="?/removeCollaborator" use:enhance={() => refreshOnSuccess()}>
<input type="hidden" name="userId" value={collab.id} />
<Button variant="danger" type="submit" onclick={() => (showCollabModal = false)}>Remove</Button>
</form>
{/if}
</li>
{/each}
</ul>
{/if}
</div>

{#if data.isOwner}
<div>
<h4 class="text-sm font-medium text-gray-700 mb-2">Add collaborator</h4>
<form method="POST" action="?/addCollaborator" use:enhance={() => refreshOnSuccess(true)}>
<div class="flex flex-col gap-2 sm:flex-row sm:items-start mb-2">
<select
name="userId"
bind:value={selectedUserId}
class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
aria-label="User to add as collaborator"
>
<option value="">Select a user...</option>
{#each availableUsers as user}
<option value={user.id}>{user.displayName} ({user.email})</option>
{/each}
</select>
<div class="flex flex-col gap-1 sm:w-48">
<label for="new-collab-role" class="text-xs font-medium text-gray-600">Role</label>
<select
id="new-collab-role"
name="role"
bind:value={selectedRole}
class="rounded-md border border-gray-300 px-3 py-2 text-sm"
aria-describedby="collab-role-help"
>
<option value="EDITOR">Editor</option>
<option value="ADMIN">Admin</option>
</select>
</div>
</div>
<p id="collab-role-help" class="text-xs text-gray-500 mb-2">
{#if selectedRole === "EDITOR"}
{collaborationUiCopy.editorSongBlurb}
{:else}
{collaborationUiCopy.adminCollabBlurb}
{/if}
</p>
<Button type="submit" disabled={!selectedUserId}>Add</Button>
</form>
</div>

<div class="border-t pt-4">
<h4 class="text-sm font-medium text-gray-700 mb-2">Transfer ownership</h4>
<p class="text-xs text-gray-500 mb-2">The previous owner becomes a collaborator with Editor access.</p>
<form method="POST" action="?/transferOwnership" use:enhance={() => refreshOnSuccess(true)}>
<div class="flex gap-2">
<select
name="newOwnerId"
bind:value={selectedUserId}
class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
>
<option value="">Select new owner...</option>
{#each data.collaborators as collab}
<option value={collab.id}>{collab.displayName} ({collab.email})</option>
{/each}
</select>
<Button type="submit" variant="danger" disabled={!selectedUserId}>Transfer</Button>
</div>
</form>
</div>
{/if}
</div>
{/snippet}
</Modal>
