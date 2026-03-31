<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let showEditModal = $state(false);
	let editingVersion = $state(data.song.versions[0]);
	let editTitle = $state('');
	let editAuthor = $state('');
	let editContent = $state('');
	let editCopyright = $state('');

	let previewPng = $state<string | null>(null);
	let isGeneratingPreview = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function updatePreview(content: string, title: string, author: string, copyright: string) {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			if (!content.trim()) {
				previewPng = null;
				return;
			}
			isGeneratingPreview = true;
			try {
				const res = await fetch('/api/songs/preview', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content, title, author, copyright }),
				});
				const data = await res.json();
				if (data.png) {
					previewPng = data.png;
				}
			} catch (e) {
				console.error('Preview error:', e);
			} finally {
				isGeneratingPreview = false;
			}
		}, 300);
	}

	function openEdit(versionIndex: number) {
		editingVersion = data.song.versions[versionIndex];
		const metadata = parseMetadata(editingVersion.metadata);
		editTitle = editingVersion.title;
		editAuthor = editingVersion.author || '';
		editContent = editingVersion.content;
		editCopyright = metadata.copyright || '';
		previewPng = null;
		showEditModal = true;
		updatePreview(editingVersion.content, editTitle, editAuthor, editCopyright);
	}

	function handleContentChange(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		editContent = target.value;
		updatePreview(target.value, editTitle, editAuthor, editCopyright);
	}

	function parseMetadata(metadataStr: string): Record<string, string> {
		try {
			return JSON.parse(metadataStr);
		} catch {
			return {};
		}
	}
</script>

<svelte:head>
	<title>{data.song.versions[0]?.title || 'Song'} - Songbook</title>
</svelte:head>

<div class="mb-6">
	<a href="/songs" class="text-indigo-600 hover:text-indigo-800 text-sm">&larr; Back to Songs</a>
</div>

{#if data.song.isArchived}
	<div class="mb-4 p-3 bg-gray-100 text-gray-700 rounded-md">
		This song is archived
	</div>
{/if}

<div class="bg-white shadow rounded-lg overflow-hidden">
	<div class="px-6 py-4 border-b flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{data.song.versions[0]?.title || 'Untitled'}</h1>
			{#if data.song.versions[0]?.author}
				<p class="text-gray-500">{data.song.versions[0].author}</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button onclick={() => openEdit(0)}>Edit Current Version</Button>
		</div>
	</div>

	{#if data.song.versions[0]}
		{@const metadata = parseMetadata(data.song.versions[0].metadata)}
		<div class="px-6 py-4 border-b bg-gray-50">
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-gray-500">Created:</span>
					<span class="ml-1">{new Date(data.song.versions[0].createdAt).toLocaleDateString()}</span>
				</div>
				{#if metadata.copyright}
					<div>
						<span class="text-gray-500">Copyright:</span>
						<span class="ml-1">{metadata.copyright}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="px-6 py-4">
		<pre class="whitespace-pre-wrap font-mono text-sm text-gray-800">{data.song.versions[0]?.content || ''}</pre>
	</div>
</div>

{#if data.song.versions.length > 1}
	<div class="mt-8">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<ul class="divide-y divide-gray-200">
				{#each data.song.versions.slice(1) as version, i}
					{@const metadata = parseMetadata(version.metadata)}
					<li class="px-6 py-4">
						<div class="flex justify-between items-start">
							<div>
								<p class="font-medium text-gray-900">{version.title}</p>
								{#if version.author}
									<p class="text-sm text-gray-500">{version.author}</p>
								{/if}
								<p class="text-sm text-gray-400 mt-1">
									{new Date(version.createdAt).toLocaleDateString()}
									{#if metadata.copyright} &bull; {metadata.copyright}{/if}
								</p>
							</div>
							<div class="flex gap-2">
								<form method="POST" action="?/deleteVersion" use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											await invalidateAll();
										}
									};
								}}>
									<input type="hidden" name="versionId" value={version.id} />
									<Button variant="danger" type="submit">Delete</Button>
								</form>
								<Button variant="secondary" onclick={() => openEdit(i + 1)}>View/Edit</Button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<Modal bind:open={showEditModal} title="Edit Song Version" onclose={() => showEditModal = false} fullscreen>
	{#snippet children()}
		<div class="flex gap-6 items-stretch h-full -m-6">
			<div class="flex-1 min-w-0 flex flex-col p-6">
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								showEditModal = false;
								await invalidateAll();
							}
						};
					}}
					class="flex-1 flex flex-col"
				>
					{#if form?.error}
						<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
							{form.error}
						</div>
					{/if}

					<Input label="Title" id="title" required bind:value={editTitle} />
					<Input label="Author" id="author" bind:value={editAuthor} />
					<div class="flex-1">
						<Input label="Content" id="content" type="textarea" rows={30} required value={editContent} oninput={handleContentChange} />
					</div>
					<Input label="Copyright" id="copyright" bind:value={editCopyright} />

					<div class="flex justify-end gap-2 mt-6">
						<Button variant="secondary" onclick={() => showEditModal = false}>Cancel</Button>
						<Button type="submit">Save Version</Button>
					</div>
				</form>
			</div>
			<div class="w-3/5 bg-gray-50 p-6 flex flex-col">
				<h3 class="text-sm font-medium text-gray-700 mb-3">Preview</h3>
				<div class="flex-1 flex items-center justify-center overflow-auto">
					{#if isGeneratingPreview}
						<div class="text-gray-400">
							Generating preview...
						</div>
					{:else if previewPng}
						<img src={previewPng} alt="Song preview" class="max-h-full object-contain border border-gray-200 rounded" />
					{:else}
						<div class="text-gray-400 text-sm">
							Start typing to see preview
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/snippet}
</Modal>
