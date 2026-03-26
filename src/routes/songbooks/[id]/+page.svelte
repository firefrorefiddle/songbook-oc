<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let showAddSongModal = $state(false);
	let showNewVersionModal = $state(false);
	let selectedSongVersionId = $state('');

	function getCurrentVersion() {
		return data.songbook.versions[0];
	}
</script>

<svelte:head>
	<title>{getCurrentVersion()?.title || 'Songbook'} - Songbook</title>
</svelte:head>

<div class="mb-6">
	<a href="/songbooks" class="text-indigo-600 hover:text-indigo-800 text-sm">&larr; Back to Songbooks</a>
</div>

{#if data.songbook.isArchived}
	<div class="mb-4 p-3 bg-gray-100 text-gray-700 rounded-md">
		This songbook is archived
	</div>
{/if}

<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
	<div class="px-6 py-4 border-b flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{getCurrentVersion()?.title || 'Untitled'}</h1>
			{#if getCurrentVersion()?.description}
				<p class="text-gray-500 mt-1">{getCurrentVersion().description}</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button onclick={() => showAddSongModal = true}>Add Song</Button>
			<Button variant="secondary" onclick={() => showNewVersionModal = true}>New Version</Button>
		</div>
	</div>

	<div class="px-6 py-4 border-b bg-gray-50">
		<div class="text-sm text-gray-500">
			{getCurrentVersion()?.songs.length || 0} songs in this version
			&bull; Created {new Date(getCurrentVersion()?.createdAt || '').toLocaleDateString()}
		</div>
	</div>

	{#if getCurrentVersion()?.songs.length === 0}
		<div class="px-6 py-12 text-center text-gray-500">
			<p>No songs in this version yet.</p>
			<div class="mt-4">
				<Button onclick={() => showAddSongModal = true} variant="secondary">Add your first song</Button>
			</div>
		</div>
	{:else}
		<ul class="divide-y divide-gray-200">
			{#each getCurrentVersion()?.songs || [] as songbookSong, index}
				<li class="px-6 py-4 flex items-center justify-between">
					<div class="flex items-center gap-4">
						<span class="text-gray-400 text-sm w-6">{index + 1}.</span>
						<div>
							<a href="/songs/{songbookSong.songVersion.song.id}" class="text-indigo-600 hover:text-indigo-800 font-medium">
								{songbookSong.songVersion.title}
							</a>
							{#if songbookSong.songVersion.author}
								<p class="text-sm text-gray-500">{songbookSong.songVersion.author}</p>
							{/if}
						</div>
					</div>
					<form method="POST" action="?/removeSong" use:enhance={() => {
						return ({ result }) => {
							if (result.type === 'success') {
								goto(`/songbooks/${data.songbook.id}`);
							}
						};
					}}>
						<input type="hidden" name="songVersionId" value={songbookSong.songVersion.id} />
						<Button type="submit" variant="danger">Remove</Button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if data.songbook.versions.length > 1}
	<div class="mt-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<ul class="divide-y divide-gray-200">
				{#each data.songbook.versions.slice(1) as version}
					<li class="px-6 py-4">
						<div class="flex justify-between items-start">
							<div>
								<p class="font-medium text-gray-900">{version.title}</p>
								{#if version.description}
									<p class="text-sm text-gray-500">{version.description}</p>
								{/if}
								<p class="text-sm text-gray-400 mt-1">
									{version.songs.length} songs &bull;
									{new Date(version.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<Modal bind:open={showAddSongModal} title="Add Song to Songbook" onclose={() => showAddSongModal = false}>
	{#snippet children()}
		{#if data.availableSongs.length === 0}
			<p class="text-gray-700 mb-4">No songs available. Create a song first.</p>
			<div class="flex justify-end">
				<Button onclick={() => { showAddSongModal = false; goto('/songs'); }}>Go to Songs</Button>
			</div>
		{:else}
			<form
				method="POST"
				action="?/addSong"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') {
							showAddSongModal = false;
							goto(`/songbooks/${data.songbook.id}`);
						}
					};
				}}
			>
				{#if form?.error}
					<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
						{form.error}
					</div>
				{/if}

				<div class="mb-4">
					<label for="songVersionId" class="block text-sm font-medium text-gray-700 mb-1">
						Select Song Version <span class="text-red-500">*</span>
					</label>
					<select
						id="songVersionId"
						name="songVersionId"
						bind:value={selectedSongVersionId}
						required
						class="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
					>
						<option value="">Choose a song...</option>
						{#each data.availableSongs as song}
							{#if song.versions[0]}
								<option value={song.versions[0].id}>
									{song.versions[0].title} - {song.versions[0].author || 'Unknown'}
								</option>
							{/if}
						{/each}
					</select>
				</div>

				<div class="flex justify-end gap-2">
					<Button variant="secondary" onclick={() => showAddSongModal = false}>Cancel</Button>
					<Button type="submit" disabled={!selectedSongVersionId}>Add Song</Button>
				</div>
			</form>
		{/if}
	{/snippet}
</Modal>

<Modal bind:open={showNewVersionModal} title="Create New Version" onclose={() => showNewVersionModal = false}>
	{#snippet children()}
		<form
			method="POST"
			action="?/createVersion"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						showNewVersionModal = false;
						goto(`/songbooks/${data.songbook.id}`);
					}
				};
			}}
		>
			{#if form?.error}
				<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
					{form.error}
				</div>
			{/if}

			<Input label="Title" id="title" required />
			<Input label="Description" id="description" type="textarea" rows={3} />

			<div class="flex justify-end gap-2 mt-6">
				<Button variant="secondary" onclick={() => showNewVersionModal = false}>Cancel</Button>
				<Button type="submit">Create Version</Button>
			</div>
		</form>
	{/snippet}
</Modal>
