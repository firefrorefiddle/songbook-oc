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
  let createTitle = $state("");
  let createAuthor = $state("");
  let createContent = $state("");
  let createMetadata = $state<Record<string, string>>({});

  $effect(() => {
    searchInput = data.search;
    includeArchived = data.includeArchived;
  });

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchInput) params.set("search", searchInput);
    if (includeArchived) params.set("includeArchived", "true");
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

<div class="mb-6 flex gap-4">
  <div class="flex-1">
    <input
      type="text"
      placeholder="Search songs..."
      bind:value={searchInput}
      onkeydown={(e) => e.key === "Enter" && handleSearch()}
      class="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
    />
  </div>
  <Button variant="secondary" onclick={handleSearch}>Search</Button>
  <label class="flex items-center gap-2">
    <input
      type="checkbox"
      bind:checked={includeArchived}
      onchange={handleSearch}
      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span class="text-sm text-gray-700">Show archived</span>
  </label>
</div>

{#if data.songs.length === 0}
  <div class="text-center py-12 text-gray-500">
    {#if data.search}
      <p>No songs found matching "{data.search}"</p>
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
