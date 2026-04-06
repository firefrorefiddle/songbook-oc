<script lang="ts">
  import { goto } from "$app/navigation";

  let { data } = $props();

  let searchInput = $state(data.search);

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchInput) params.set("search", searchInput);
    goto(`/people?${params.toString()}`);
  }
</script>

<svelte:head>
  <title>People - Songbook</title>
</svelte:head>

<div class="space-y-8">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">People</h1>

    <div class="mb-6 flex gap-4">
      <div class="flex-1">
        <input
          type="text"
          placeholder="Search by name or email..."
          bind:value={searchInput}
          onkeydown={(e) => e.key === "Enter" && handleSearch()}
          class="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <button
        onclick={handleSearch}
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Search
      </button>
    </div>

    {#if data.users.length === 0}
      <div class="text-center py-12 text-gray-500">
        {#if data.search}
          <p>No people found matching "{data.search}"</p>
        {:else}
          <p>No other users in the community yet.</p>
        {/if}
      </div>
    {:else}
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul class="divide-y divide-gray-200">
          {#each data.users as user}
            <li>
              <a href="/people/{user.id}" class="block hover:bg-gray-50">
                <div class="px-4 py-4 sm:px-6">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {user.displayName}
                      </p>
                      <p class="text-sm text-gray-500">{user.email}</p>
                      {#if user.publicBio}
                        <p class="mt-2 text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">
                          {user.publicBio}
                        </p>
                      {/if}
                      <p class="mt-1 text-xs text-gray-400">
                        {user.ownedSongsCount} songs, {user.ownedSongbooksCount} songbooks
                        {#if user.sharedWithCurrentUser}
                          <span class="ml-2 text-green-600">Shared with you</span>
                        {/if}
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>

  <div>
    <h2 class="text-xl font-bold text-gray-900 mb-4">Shared with me</h2>
    {#if data.sharedContent.songs.length === 0 && data.sharedContent.songbooks.length === 0}
      <p class="text-gray-500">Nothing has been shared with you yet.</p>
    {:else}
      <div class="grid gap-4 md:grid-cols-2">
        {#if data.sharedContent.songs.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Songs</h3>
            <ul class="bg-white shadow rounded-md divide-y divide-gray-200">
              {#each data.sharedContent.songs as song}
                <li>
                  <a
                    href="/songs/{song.id}"
                    class="block px-4 py-2 hover:bg-gray-50"
                  >
                    <span class="text-sm text-indigo-600">{song.title}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if data.sharedContent.songbooks.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Songbooks</h3>
            <ul class="bg-white shadow rounded-md divide-y divide-gray-200">
              {#each data.sharedContent.songbooks as songbook}
                <li>
                  <a
                    href="/songbooks/{songbook.id}"
                    class="block px-4 py-2 hover:bg-gray-50"
                  >
                    <span class="text-sm text-indigo-600">{songbook.title}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>