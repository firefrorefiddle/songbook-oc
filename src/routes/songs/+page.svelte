<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { getPreferredSongVersion } from "$lib/songVersions";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import SongVersionEditorForm from "$lib/components/SongVersionEditorForm.svelte";

  let { data, form } = $props();

  let showCreateModal = $state(false);
  let showDeleteConfirm = $state(false);
  let songToDelete = $state<{ id: string; title: string } | null>(null);
  let searchInput = $state("");
  let includeArchived = $state(false);
  let selectedTagId = $state("");
  let selectedCategoryId = $state("");
  let createTitle = $state("");
  let createAuthor = $state("");
  let createContent = $state("");
  let createMetadata = $state<Record<string, string>>({});

  $effect(() => {
    searchInput = data.search;
    includeArchived = data.includeArchived;
    selectedTagId = data.tagId ?? "";
    selectedCategoryId = data.categoryId ?? "";
  });

  function applyListParams() {
    const params = new URLSearchParams();
    if (searchInput) params.set("search", searchInput);
    if (includeArchived) params.set("includeArchived", "true");
    if (selectedTagId) params.set("tag", selectedTagId);
    if (selectedCategoryId) params.set("category", selectedCategoryId);
    goto(`/songs?${params.toString()}`);
  }

  function handleCreateSuccess() {
    showCreateModal = false;
    goto("/songs");
  }

  function confirmDelete(song: { id: string; title: string }) {
    songToDelete = song;
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    songToDelete = null;
    showDeleteConfirm = false;
  }

  function getDisplayedVersion(song: (typeof data.songs)[number]) {
    return getPreferredSongVersion(song);
  }
</script>

<svelte:head>
  <title>Songs - Songbook</title>
</svelte:head>

<div class="flex justify-between items-center mb-6">
  <h1 class="text-2xl font-bold text-gray-900">Songs</h1>
  <Button onclick={() => (showCreateModal = true)}>Create Song</Button>
</div>

<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
  <div class="flex-1 min-w-[12rem]">
    <label for="song-search" class="block text-sm font-medium text-gray-700 mb-1"
      >Search</label
    >
    <input
      id="song-search"
      type="text"
      placeholder="Search title, lyrics, author, or metadata…"
      bind:value={searchInput}
      onkeydown={(e) => e.key === "Enter" && applyListParams()}
      class="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
    />
  </div>
  <div class="w-full sm:w-auto sm:min-w-[10rem]">
    <label for="song-filter-tag" class="block text-sm font-medium text-gray-700 mb-1"
      >Tag</label
    >
    <select
      id="song-filter-tag"
      bind:value={selectedTagId}
      onchange={applyListParams}
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
    >
      <option value="">All tags</option>
      {#each data.tagOptions as opt (opt.id)}
        <option value={opt.id}>{opt.name}</option>
      {/each}
    </select>
  </div>
  <div class="w-full sm:w-auto sm:min-w-[10rem]">
    <label
      for="song-filter-category"
      class="block text-sm font-medium text-gray-700 mb-1">Category</label
    >
    <select
      id="song-filter-category"
      bind:value={selectedCategoryId}
      onchange={applyListParams}
      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
    >
      <option value="">All categories</option>
      {#each data.categoryOptions as opt (opt.id)}
        <option value={opt.id}>{opt.name}</option>
      {/each}
    </select>
  </div>
  <div class="flex gap-3 items-center">
    <Button variant="secondary" onclick={applyListParams}>Apply</Button>
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        bind:checked={includeArchived}
        onchange={applyListParams}
        class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span class="text-sm text-gray-700">Show archived</span>
    </label>
  </div>
</div>

{#if data.songs.length === 0}
  <div class="text-center py-12 text-gray-500">
    {#if data.search || data.tagId || data.categoryId}
      <p>
        No songs match your filters{#if data.search} for “{data.search}”{/if}.
      </p>
      <p class="mt-2 text-sm">
        <button
          type="button"
          class="text-indigo-600 hover:text-indigo-800 underline"
          onclick={() => goto("/songs")}
        >
          Clear filters
        </button>
      </p>
    {:else}
      <p>No songs yet. Create your first song!</p>
    {/if}
  </div>
{:else}
  <div class="bg-white shadow overflow-hidden sm:rounded-md">
    <ul class="divide-y divide-gray-200">
      {#each data.songs as song}
        {@const displayedVersion = getDisplayedVersion(song)}
        <li>
          <div class="px-4 py-4 sm:px-6 flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <a
                href="/songs/{song.id}"
                class="block hover:bg-gray-50 -mx-4 px-4"
              >
                <p class="text-sm font-medium text-indigo-600 truncate">
                  {displayedVersion?.title || "Untitled"}
                </p>
                {#if displayedVersion?.author}
                  <p class="text-sm text-gray-500">{displayedVersion.author}</p>
                {/if}
                {#if song.recommendedVersionId && song.recommendedVersionId !== song.versions[0]?.id}
                  <p class="mt-1 text-xs text-amber-700">
                    Using a recommended version instead of the newest draft
                  </p>
                {/if}
                {#if song.categories.length > 0 || song.tags.length > 0}
                  <div class="mt-1 flex flex-wrap gap-1">
                    {#each [...song.categories].sort((a, b) =>
                      a.category.name.localeCompare(b.category.name),
                    ) as row (row.categoryId)}
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-900"
                        >{row.category.name}</span
                      >
                    {/each}
                    {#each [...song.tags].sort((a, b) => a.tag.name.localeCompare(b.tag.name)) as row (row.tagId)}
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-900"
                        >{row.tag.name}</span
                      >
                    {/each}
                  </div>
                {/if}
                {#if song.isArchived}
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1"
                  >
                    Archived
                  </span>
                {/if}
              </a>
            </div>
            <div class="ml-4 flex-shrink-0 flex gap-2">
              <Button
                variant="secondary"
                onclick={() => goto(`/songs/${song.id}`)}>View</Button
              >
              {#if !song.isArchived}
                <Button
                  variant="danger"
                  onclick={() =>
                    confirmDelete({
                      id: song.id,
                      title: displayedVersion?.title || "Untitled",
                    })}
                >
                  Archive
                </Button>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<Modal
  bind:open={showCreateModal}
  title="Create Song"
  onclose={() => (showCreateModal = false)}
  fullscreen
>
  {#snippet children()}
    <SongVersionEditorForm
      action="?/create"
      error={form?.error}
      bind:title={createTitle}
      bind:author={createAuthor}
      bind:content={createContent}
      bind:metadata={createMetadata}
      submitLabel="Create"
      onCancel={() => (showCreateModal = false)}
      enhanceSubmit={() => {
        return ({ result }) => {
          if (result.type === "success") {
            handleCreateSuccess();
          }
        };
      }}
    />
  {/snippet}
</Modal>

<Modal
  bind:open={showDeleteConfirm}
  title="Archive Song"
  onclose={cancelDelete}
>
  {#snippet children()}
    <p class="text-gray-700 mb-6">
      Are you sure you want to archive "{songToDelete?.title}"? It will no
      longer appear in songbooks.
    </p>
    <form
      method="POST"
      action="?/delete"
      use:enhance={() => {
        return ({ result }) => {
          if (result.type === "success") {
            cancelDelete();
            goto("/songs");
          }
        };
      }}
    >
      <input type="hidden" name="id" value={songToDelete?.id} />
      <div class="flex justify-end gap-2">
        <Button variant="secondary" onclick={cancelDelete}>Cancel</Button>
        <Button type="submit" variant="danger">Archive</Button>
      </div>
    </form>
  {/snippet}
</Modal>
