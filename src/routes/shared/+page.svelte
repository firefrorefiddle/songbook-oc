<script lang="ts">
  import { goto } from "$app/navigation";
  import { getPreferredSongVersion } from "$lib/songVersions";
  import Button from "$lib/components/Button.svelte";

  let { data } = $props();

  function handleFilter(newFilter: string) {
    const params = new URLSearchParams();
    if (newFilter !== "all") params.set("filter", newFilter);
    goto(`/shared?${params.toString()}`);
  }

  function getDisplayedVersion(song: (typeof data.songs)[number]) {
    return getPreferredSongVersion(song);
  }

  function getOwnerName(owner: (typeof data.songs)[number]["owner"]) {
    if (owner.firstName && owner.lastName) {
      return `${owner.firstName} ${owner.lastName}`;
    }
    return owner.email || "Unknown";
  }

  function getCollabRole(song: (typeof data.songs)[number]) {
    return song.collaborations[0]?.role || "EDITOR";
  }

  function getSongbookOwnerName(owner: (typeof data.songbooks)[number]["owner"]) {
    if (owner.firstName && owner.lastName) {
      return `${owner.firstName} ${owner.lastName}`;
    }
    return owner.email || "Unknown";
  }

  function getSongbookCollabRole(songbook: (typeof data.songbooks)[number]) {
    return songbook.collaborations[0]?.role || "EDITOR";
  }
</script>

<svelte:head>
  <title>Shared with me - Songbook</title>
</svelte:head>

<div class="mb-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-4">Shared with me</h1>

  <div class="flex gap-2">
    <Button
      variant={data.filter === "all" ? "primary" : "secondary"}
      onclick={() => handleFilter("all")}
    >
      All
    </Button>
    <Button
      variant={data.filter === "songs" ? "primary" : "secondary"}
      onclick={() => handleFilter("songs")}
    >
      Songs ({data.songs.length})
    </Button>
    <Button
      variant={data.filter === "songbooks" ? "primary" : "secondary"}
      onclick={() => handleFilter("songbooks")}
    >
      Songbooks ({data.songbooks.length})
    </Button>
  </div>
</div>

{#if data.songs.length === 0 && data.songbooks.length === 0}
  <div class="text-center py-12 text-gray-500">
    <p>Nothing has been shared with you yet.</p>
    <p class="mt-2 text-sm">
      When someone shares a song or songbook with you, it will appear here.
    </p>
  </div>
{:else}
  {#if data.filter === "all" || data.filter === "songs"}
    {#if data.songs.length > 0}
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Songs</h2>
      <div class="bg-white shadow overflow-hidden sm:rounded-md mb-8">
        <ul class="divide-y divide-gray-200">
          {#each data.songs as song}
            {@const displayedVersion = getDisplayedVersion(song)}
            {@const collabRole = getCollabRole(song)}
            <li>
              <div class="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <a href="/songs/{song.id}" class="block hover:bg-gray-50 -mx-4 px-4">
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      {displayedVersion?.title || "Untitled"}
                    </p>
                    {#if displayedVersion?.author}
                      <p class="text-sm text-gray-500">{displayedVersion.author}</p>
                    {/if}
                    <p class="mt-1 text-xs text-gray-500">
                      Shared by {getOwnerName(song.owner)}
                    </p>
                  </a>
                </div>
                <div class="ml-4 flex-shrink-0 flex items-center gap-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {collabRole}
                  </span>
                  <Button variant="secondary" onclick={() => goto(`/songs/${song.id}`)}
                    >View</Button
                  >
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}

  {#if data.filter === "all" || data.filter === "songbooks"}
    {#if data.songbooks.length > 0}
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Songbooks</h2>
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          {#each data.songbooks as songbook}
            {@const latestVersion = songbook.versions[0]}
            {@const collabRole = getSongbookCollabRole(songbook)}
            <li>
              <div class="px-4 py-4 sm:px-6 flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <a
                    href="/songbooks/{songbook.id}"
                    class="block hover:bg-gray-50 -mx-4 px-4"
                  >
                    <p class="text-sm font-medium text-indigo-600 truncate">
                      {latestVersion?.title || "Untitled"}
                    </p>
                    {#if latestVersion?.description}
                      <p class="text-sm text-gray-500">{latestVersion.description}</p>
                    {/if}
                    <p class="mt-1 text-xs text-gray-500">
                      Shared by {getSongbookOwnerName(songbook.owner)}
                    </p>
                  </a>
                </div>
                <div class="ml-4 flex-shrink-0 flex items-center gap-2">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {collabRole}
                  </span>
                  <Button variant="secondary" onclick={() => goto(`/songbooks/${songbook.id}`)}
                    >View</Button
                  >
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
{/if}