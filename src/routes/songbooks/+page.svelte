<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let showCreateModal = $state(false);
	let showDeleteConfirm = $state(false);
	let songbookToDelete = $state<{ id: string; title: string } | null>(null);
	let searchInput = $state('');
	let includeArchived = $state(false);

	$effect(() => {
		searchInput = data.search;
		includeArchived = data.includeArchived;
	});

	function handleSearch() {
		const params = new URLSearchParams();
		if (searchInput) params.set('search', searchInput);
		if (includeArchived) params.set('includeArchived', 'true');
		goto(`/songbooks?${params.toString()}`);
	}

	function handleCreateSuccess() {
		showCreateModal = false;
		goto('/songbooks', { invalidateAll: true });
	}

	function confirmDelete(songbook: { id: string; title: string }) {
		songbookToDelete = songbook;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		songbookToDelete = null;
		showDeleteConfirm = false;
	}
</script>

<svelte:head>
	<title>Songbooks - Songbook</title>
</svelte:head>

<div class="flex justify-between items-center mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Songbooks</h1>
	<Button onclick={() => showCreateModal = true}>Create Songbook</Button>
</div>

<div class="mb-6 flex gap-4">
	<div class="flex-1">
		<input
			type="text"
			placeholder="Search songbooks..."
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

{#if data.songbooks.length === 0}
	<div class="text-center py-12 text-gray-500">
		{#if data.search}
			<p>No songbooks found matching "{data.search}"</p>
		{:else}
			<p>No songbooks yet. Create your first songbook!</p>
		{/if}
	</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each data.songbooks as songbook}
			<div class="bg-white shadow rounded-lg overflow-hidden">
				<div class="px-4 py-5 sm:p-6">
					<a href="/songbooks/{songbook.id}" class="block hover:bg-gray-50 -mx-4 px-4 py-4">
						<h3 class="text-lg font-medium text-indigo-600 truncate">
							{songbook.versions[0]?.title || 'Untitled'}
						</h3>
						{#if songbook.versions[0]?.description}
							<p class="mt-1 text-sm text-gray-500 line-clamp-2">{songbook.versions[0].description}</p>
						{/if}
						<p class="mt-2 text-sm text-gray-400">
							{songbook.versions[0]?.songs.length || 0} songs
						</p>
						{#if songbook.isArchived}
							<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-2">
								Archived
							</span>
						{/if}
					</a>
					<div class="mt-4 flex gap-2">
						<Button variant="secondary" onclick={() => goto(`/songbooks/${songbook.id}`)}>View</Button>
						{#if !songbook.isArchived}
							<Button variant="danger" onclick={() => confirmDelete({ id: songbook.id, title: songbook.versions[0]?.title || 'Untitled' })}>
								Archive
							</Button>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

<Modal bind:open={showCreateModal} title="Create Songbook" onclose={() => showCreateModal = false}>
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

			<Input label="Title" id="title" required value={form?.fields?.title || ''} />
			<Input label="Description" id="description" type="textarea" rows={3} value={form?.fields?.description || ''} />

			<div class="flex justify-end gap-2 mt-6">
				<Button variant="secondary" onclick={() => showCreateModal = false}>Cancel</Button>
				<Button type="submit">Create</Button>
			</div>
		</form>
	{/snippet}
</Modal>

<Modal bind:open={showDeleteConfirm} title="Archive Songbook" onclose={cancelDelete}>
	{#snippet children()}
		<p class="text-gray-700 mb-6">
			Are you sure you want to archive "{songbookToDelete?.title}"?
		</p>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						cancelDelete();
						goto('/songbooks', { invalidateAll: true });
					}
				};
			}}
		>
			<input type="hidden" name="id" value={songbookToDelete?.id} />
			<div class="flex justify-end gap-2">
				<Button variant="secondary" onclick={cancelDelete}>Cancel</Button>
				<Button type="submit" variant="danger">Archive</Button>
			</div>
		</form>
	{/snippet}
</Modal>
