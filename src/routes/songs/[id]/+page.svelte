<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let showEditModal = $state(false);
	let editingVersion = $state(data.song.versions[0]);

	function openEdit(versionIndex: number) {
		editingVersion = data.song.versions[versionIndex];
		showEditModal = true;
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
							<Button variant="secondary" onclick={() => openEdit(i + 1)}>View/Edit</Button>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<Modal bind:open={showEditModal} title="Edit Song Version" onclose={() => showEditModal = false}>
	{#snippet children()}
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return ({ result }) => {
					if (result.type === 'success') {
						showEditModal = false;
						goto(`/songs/${data.song.id}`);
					}
				};
			}}
		>
			{#if form?.error}
				<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
					{form.error}
				</div>
			{/if}

			<Input label="Title" id="title" required value={editingVersion?.title || ''} />
			<Input label="Author" id="author" value={editingVersion?.author || ''} />
			<Input label="Content" id="content" type="textarea" rows={10} required value={editingVersion?.content || ''} />
			<Input label="Copyright" id="copyright" value={parseMetadata(editingVersion?.metadata || '{}').copyright || ''} />

			<div class="flex justify-end gap-2 mt-6">
				<Button variant="secondary" onclick={() => showEditModal = false}>Cancel</Button>
				<Button type="submit">Save Version</Button>
			</div>
		</form>
	{/snippet}
</Modal>
