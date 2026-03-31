<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let showAddSongModal = $state(false);
	let showNewVersionModal = $state(false);
	let selectedSongVersionIds = $state<string[]>([]);
	let songSearchQuery = $state('');
	let versionTitle = $state('');
	let versionDescription = $state('');
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function getCurrentVersion() {
		return data.songbook.versions[0];
	}

	function fuzzyMatch(text: string, pattern: string): boolean {
		const textLower = text.toLowerCase();
		const patternLower = pattern.toLowerCase();
		let patternIdx = 0;
		for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
			if (textLower[i] === patternLower[patternIdx]) {
				patternIdx++;
			}
		}
		return patternIdx === patternLower.length;
	}

	function getFilteredSongs() {
		if (!songSearchQuery.trim()) {
			return data.availableSongs;
		}
		const query = songSearchQuery.trim();
		return data.availableSongs.filter((song) => {
			const latestVersion = song.versions[0];
			if (!latestVersion) return false;
			const titleMatch = fuzzyMatch(latestVersion.title, query);
			const authorMatch = latestVersion.author ? fuzzyMatch(latestVersion.author, query) : false;
			return titleMatch || authorMatch;
		});
	}

	function toggleSong(songVersionId: string) {
		if (selectedSongVersionIds.includes(songVersionId)) {
			selectedSongVersionIds = selectedSongVersionIds.filter((id) => id !== songVersionId);
		} else {
			selectedSongVersionIds = [...selectedSongVersionIds, songVersionId];
		}
	}

	function toggleAll(checked: boolean) {
		const filtered = getFilteredSongs();
		const versionIds = filtered.map((s) => s.versions[0]?.id).filter(Boolean) as string[];
		if (checked) {
			const existing = new Set(selectedSongVersionIds);
			selectedSongVersionIds = [...selectedSongVersionIds, ...versionIds.filter((id) => !existing.has(id))];
		} else {
			selectedSongVersionIds = selectedSongVersionIds.filter((id) => !versionIds.includes(id));
		}
	}

	function isAllSelected() {
		const filtered = getFilteredSongs();
		const versionIds = filtered.map((s) => s.versions[0]?.id).filter(Boolean) as string[];
		return versionIds.length > 0 && versionIds.every((id) => selectedSongVersionIds.includes(id));
	}

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', index.toString());
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		dragOverIndex = null;
		if (draggedIndex === null || draggedIndex === targetIndex) {
			draggedIndex = null;
			return;
		}

		const songs = [...(getCurrentVersion()?.songs || [])];
		const [removed] = songs.splice(draggedIndex, 1);
		songs.splice(targetIndex, 0, removed);

		const songVersionIds = songs.map(s => s.songVersion.id);
		console.log('Drop reorder:', songVersionIds);

		const form = document.getElementById('reorder-form') as HTMLFormElement;
		if (!form) return;

		const inputs = form.querySelectorAll('input[name="songVersionIds"]');
		inputs.forEach((input, i) => {
			(input as HTMLInputElement).value = songVersionIds[i];
		});

		form.requestSubmit();

		draggedIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	let isGeneratingPdf = $state(false);
	let isDownloadingPdf = $state(false);

	async function generatePdf() {
		if (isGeneratingPdf) return;
		isGeneratingPdf = true;
		try {
			const response = await fetch(`/api/songbooks/${data.songbook.id}/pdf/generate`, {
				method: 'POST'
			});
			if (!response.ok) {
				const err = await response.text();
				alert(`Failed to generate PDF: ${err}`);
				return;
			}
			await invalidateAll();
		} finally {
			isGeneratingPdf = false;
		}
	}

	async function downloadPdf() {
		if (isDownloadingPdf) return;
		isDownloadingPdf = true;
		try {
			const response = await fetch(`/api/songbooks/${data.songbook.id}/pdf`);
			if (!response.ok) {
				alert('PDF not available. Please generate it first.');
				return;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${getCurrentVersion()?.title || 'songbook'}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} finally {
			isDownloadingPdf = false;
		}
	}

	async function viewLog() {
		const response = await fetch(`/api/songbooks/${data.songbook.id}/pdf/log`);
		if (!response.ok) {
			alert('Log not available');
			return;
		}
		const logContent = await response.text();
		const logWindow = window.open('', '_blank');
		if (logWindow) {
			logWindow.document.write(`<pre>${logContent}</pre>`);
		}
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
			<Button onclick={() => generatePdf()} disabled={isGeneratingPdf || !getCurrentVersion()?.songs.length}>
				{isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
			</Button>
			{#if getCurrentVersion()?.pdfPath}
				<Button onclick={() => downloadPdf()} disabled={isDownloadingPdf || !getCurrentVersion()?.songs.length}>
					{isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
					{#if getCurrentVersion()?.pdfGeneratedAt}
						({new Date(getCurrentVersion().pdfGeneratedAt).toLocaleDateString()})
					{/if}
				</Button>
			{/if}
			{#if getCurrentVersion()?.pdfLogPath}
				<Button variant="secondary" onclick={() => viewLog()}>View Log</Button>
			{/if}
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
				<li
					class="px-6 py-4 flex items-center justify-between cursor-move"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
					class:bg-indigo-50={draggedIndex === index}
					class:border-l-4={dragOverIndex === index}
					class:border-l-indigo-500={dragOverIndex === index}
				>
					<div class="flex items-center gap-4">
						<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
						</svg>
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

<form id="reorder-form" method="POST" action="?/reorderSongs">
	{#each getCurrentVersion()?.songs || [] as song}
		<input type="hidden" name="songVersionIds" value={song.songVersion.id} />
	{/each}
</form>

<Modal bind:open={showAddSongModal} title="Add Song to Songbook" onclose={() => { showAddSongModal = false; songSearchQuery = ''; }}>
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
					return async ({ result }) => {
						if (result.type === 'success') {
							showAddSongModal = false;
							songSearchQuery = '';
							selectedSongVersionIds = [];
							await invalidateAll();
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
					<input
						type="text"
						placeholder="Search songs..."
						bind:value={songSearchQuery}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<div class="mb-4 max-h-64 overflow-y-auto border rounded-md">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50 sticky top-0">
							<tr>
								<th class="px-3 py-2 text-left">
									<input
										type="checkbox"
										checked={isAllSelected()}
										onchange={(e) => toggleAll(e.currentTarget.checked)}
										class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
									/>
								</th>
								<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
								<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each getFilteredSongs() as song}
								{#if song.versions[0]}
									<tr class="hover:bg-gray-50">
										<td class="px-3 py-2">
											<input
												type="checkbox"
												name="songVersionIds"
												value={song.versions[0].id}
												checked={selectedSongVersionIds.includes(song.versions[0].id)}
												onchange={() => toggleSong(song.versions[0].id)}
												class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
											/>
										</td>
										<td class="px-3 py-2 text-sm text-gray-900">{song.versions[0].title}</td>
										<td class="px-3 py-2 text-sm text-gray-500">{song.versions[0].author || 'Unknown'}</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>

				{#if selectedSongVersionIds.length > 0}
					<p class="mb-4 text-sm text-gray-600">
						{selectedSongVersionIds.length} song{selectedSongVersionIds.length === 1 ? '' : 's'} selected
					</p>
				{/if}

				<div class="flex justify-end gap-2">
					<Button variant="secondary" onclick={() => { showAddSongModal = false; songSearchQuery = ''; }}>Cancel</Button>
					<Button type="submit" disabled={selectedSongVersionIds.length === 0}>Add {selectedSongVersionIds.length > 0 ? selectedSongVersionIds.length : ''} Song{selectedSongVersionIds.length === 1 ? '' : 's'}</Button>
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
				return async ({ result }) => {
					if (result.type === 'success') {
						showNewVersionModal = false;
						await invalidateAll();
					}
				};
			}}
		>
			{#if form?.error}
				<div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
					{form.error}
				</div>
			{/if}

			<Input label="Title" id="title" required bind:value={versionTitle} />
			<Input label="Description" id="description" type="textarea" rows={3} bind:value={versionDescription} />

			<div class="flex justify-end gap-2 mt-6">
				<Button variant="secondary" onclick={() => showNewVersionModal = false}>Cancel</Button>
				<Button type="submit">Create Version</Button>
			</div>
		</form>
	{/snippet}
</Modal>
