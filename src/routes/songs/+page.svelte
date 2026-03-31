<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import MetadataEditor from '$lib/components/MetadataEditor.svelte';

	let { data, form } = $props();

	let showCreateModal = $state(false);
	let showDeleteConfirm = $state(false);
	let songToDelete = $state<{ id: string; title: string } | null>(null);
	let searchInput = $state(data.search);
	let includeArchived = $state(data.includeArchived);
	let createTitle = $state('');
	let createAuthor = $state('');
	let createContent = $state('');
	let createMetadata = $state<Record<string, string>>({});

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		if (includeArchived) params.set('includeArchived', 'true');
		goto(`/songs?${params.toString()}`);
	}

	function handleCreateSuccess() {
		showCreateModal = false;
		goto('/songs');
	}

	function confirmDelete(song: { id: string; title: string }) {
		songToDelete = song;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		songToDelete = null;
		showDeleteConfirm = false;
	}
</script>

<svelte:head>
	<title>Songs - Songbook</title>
</svelte:head>

<div class="flex justify-between items-center mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Songs</h1>
	<Button onclick={() => showCreateModal = true}>Create Song</Button>
</div>

<div class="mb-6 flex gap-4">
	<div class="flex-1">
		<input
			type="text"
			placeholder="Search songs..."
			bind:value={searchInput}
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
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
				<li>
					<div class="px-4 py-4 sm:px-6 flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<a href="/songs/{song.id}" class="block hover:bg-gray-50 -mx-4 px-4">
								<p class="text-sm font-medium text-indigo-600 truncate">
									{song.versions[0]?.title || 'Untitled'}
								</p>
								{#if song.versions[0]?.author}
									<p class="text-sm text-gray-500">{song.versions[0].author}</p>
								{/if}
								{#if song.isArchived}
									<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
										Archived
									</span>
								{/if}
							</a>
						</div>
						<div class="ml-4 flex-shrink-0 flex gap-2">
							<Button variant="secondary" onclick={() => goto(`/songs/${song.id}`)}>View</Button>
							{#if !song.isArchived}
								<Button variant="danger" onclick={() => confirmDelete({ id: song.id, title: song.versions[0]?.title || 'Untitled' })}>
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

<Modal bind:open={showCreateModal} title="Create Song" onclose={() => showCreateModal = false}>
	{#snippet children()}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						handleCreateSuccess();
					}
				};
			}}
		>
			{#if form?.error}
				<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
					{form.error}
				</div>
			{/if}

			<Input label="Title" id="title" required bind:value={createTitle} />
			<Input label="Author" id="author" bind:value={createAuthor} />
			<Input label="Content" id="content" type="textarea" rows={10} required bind:value={createContent} />
			<MetadataEditor bind:metadata={createMetadata} />

			<div class="flex justify-end gap-2 mt-6">
				<Button variant="secondary" onclick={() => showCreateModal = false}>Cancel</Button>
				<Button type="submit">Create</Button>
			</div>
		</form>
	{/snippet}
</Modal>

<Modal bind:open={showDeleteConfirm} title="Archive Song" onclose={cancelDelete}>
	{#snippet children()}
		<p class="text-gray-700 mb-6">
			Are you sure you want to archive "{songToDelete?.title}"? It will no longer appear in songbooks.
		</p>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						cancelDelete();
						goto('/songs');
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
