<script lang="ts">
	let {
		open = $bindable(),
		title,
		onclose,
		children,
		class: className = '',
		fullscreen = false
	}: {
		open: boolean;
		title: string;
		onclose: () => void;
		children: import('svelte').Snippet;
		class?: string;
		fullscreen?: boolean;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="bg-white shadow-xl {fullscreen ? 'w-screen h-screen max-w-none max-h-none rounded-none' : 'rounded-lg max-w-lg w-full mx-4 max-h-[90vh]'} overflow-y-auto {className}">
			<div class="flex items-center justify-between px-6 py-4 border-b">
				<h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
				<button
					type="button"
					class="text-gray-400 hover:text-gray-600"
					onclick={onclose}
					aria-label="Close modal"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="px-6 py-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
