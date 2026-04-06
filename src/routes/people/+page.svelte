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
    <h1 class="text-2xl font-bold text-gray-900 mb-2">People</h1>
    <p class="text-sm text-gray-600 mb-6">
      Find collaborators by name or email. For everything others have shared with you, use
      <a href="/shared" class="text-indigo-600 hover:text-indigo-800 font-medium"
        >Shared with me</a
      >.
    </p>

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
</div>