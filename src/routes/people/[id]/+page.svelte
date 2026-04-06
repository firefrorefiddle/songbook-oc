<script lang="ts">
  let { data } = $props();
  const p = data.profile;
</script>

<svelte:head>
  <title>{p.displayName} — People - Songbook</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
  <p>
    <a href="/people" class="text-sm text-indigo-600 hover:text-indigo-800">← Back to People</a>
  </p>

  <div class="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
    <div class="px-4 py-5 sm:px-6">
      <h1 class="text-2xl font-bold text-gray-900">{p.displayName}</h1>
      <p class="mt-1 text-sm text-gray-500">{p.email}</p>
      {#if p.publicBio}
        <p class="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{p.publicBio}</p>
      {/if}
      <p class="mt-4 text-xs text-gray-400">
        {p.ownedSongsCount} songs, {p.ownedSongbooksCount} songbooks
        {#if p.sharedWithCurrentUser}
          <span class="ml-2 text-green-600">Shared with you</span>
        {/if}
      </p>
    </div>
  </div>
</div>
