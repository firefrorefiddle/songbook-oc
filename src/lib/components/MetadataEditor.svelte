<script lang="ts">
	let {
		metadata = $bindable(),
		availableKeys = ['copyright', 'reference', 'extraIndex', 'translationBy', 'musicBy', 'lyricsBy']
	}: {
		metadata?: Record<string, string>;
		availableKeys?: string[];
	} = $props();

	let entries = $state<{ key: string; value: string }[]>([]);
	let showKeySelect = $state(true);

	$effect(() => {
		if (metadata) {
			entries = Object.entries(metadata)
				.filter(([, v]) => v?.trim())
				.map(([key, value]) => ({ key, value }));
		}
		if (entries.length === 0) {
			entries = [{ key: '', value: '' }];
		}
	});

	function addEntry() {
		entries = [...entries, { key: '', value: '' }];
		showKeySelect = true;
	}

	function removeEntry(index: number) {
		entries = entries.filter((_, i) => i !== index);
		syncToMetadata();
	}

	function syncToMetadata() {
		const newMeta: Record<string, string> = {};
		for (const entry of entries) {
			if (entry.key?.trim() && entry.value?.trim()) {
				newMeta[entry.key.trim()] = entry.value.trim();
			}
		}
		metadata = newMeta;
	}

	function onKeyChange(index: number, newKeyValue: string) {
		entries[index].key = newKeyValue;
		syncToMetadata();
	}

	function onValueChange(index: number, newValue: string) {
		entries[index].value = newValue;
		syncToMetadata();
	}

	function usedKeys() {
		return entries.map(e => e.key).filter(k => k);
	}

	const unusedKeys = $derived(
		availableKeys.filter(k => !usedKeys().includes(k))
	);

	const validEntries = $derived(
		entries.filter(e => e.key?.trim() && e.value?.trim())
	);
</script>

<div class="space-y-2">
	<label class="block text-sm font-medium text-gray-700">
		Metadata
	</label>
	
	{#each entries as entry, index (index)}
		<div class="flex gap-2 items-start">
			<div class="flex-1">
				{#if showKeySelect && unusedKeys.length > 0 && !entry.key}
					<select
						class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
						value=""
						onchange={(e) => {
							const target = e.target as HTMLSelectElement;
							onKeyChange(index, target.value);
							showKeySelect = false;
						}}
					>
						<option value="">Select field...</option>
						{#each unusedKeys as key}
							<option value={key}>{key}</option>
						{/each}
						<option value="__custom__">+ Add custom field</option>
					</select>
				{:else}
					<input
						type="text"
						placeholder="Key"
						value={entry.key}
						oninput={(e) => onKeyChange(index, (e.target as HTMLInputElement).value)}
						class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
						list="metadata-keys"
					/>
				{/if}
			</div>
			<div class="flex-[2]">
				<input
					type="text"
					placeholder="Value"
					value={entry.value}
					oninput={(e) => onValueChange(index, (e.target as HTMLInputElement).value)}
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
				/>
			</div>
			<button
				type="button"
				onclick={() => removeEntry(index)}
				class="mt-1 text-gray-400 hover:text-red-500"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	{/each}

	{#each validEntries as entry}
		<input type="hidden" name="meta_{entry.key}" value={entry.value} />
	{/each}

	<datalist id="metadata-keys">
		{#each availableKeys as key}
			<option value={key}>{key}</option>
		{/each}
	</datalist>

	<button
		type="button"
		onclick={addEntry}
		class="text-sm text-indigo-600 hover:text-indigo-800"
	>
		+ Add field
	</button>
</div>
