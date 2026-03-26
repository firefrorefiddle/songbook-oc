<script lang="ts">
	let { 
		label, 
		id, 
		type = 'text', 
		value = $bindable(), 
		error = '',
		required = false,
		rows = 4,
		oninput
	}: { 
		label: string; 
		id: string; 
		type?: string;
		value?: string;
		error?: string;
		required?: boolean;
		rows?: number;
		oninput?: (e: Event) => void;
	} = $props();
</script>

<div class="mb-4">
	<label for={id} class="block text-sm font-medium text-gray-700 mb-1">
		{label}
		{#if required}<span class="text-red-500">*</span>{/if}
	</label>
	{#if type === 'textarea'}
		<textarea
			{id}
			name={id}
			bind:value
			{rows}
			{oninput}
			class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm {error ? 'border-red-300' : 'border'}"
		></textarea>
	{:else}
		<input
			{id}
			name={id}
			{type}
			bind:value
			class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm {error ? 'border-red-300' : 'border'}"
		/>
	{/if}
	{#if error}
		<p class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
