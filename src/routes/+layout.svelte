<script lang="ts">
	import '../app.css';
	import { signOut } from '@auth/sveltekit/client';

	let { children, data } = $props();

	let isAdmin = $derived(data.session?.user?.role === 'ADMIN');
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex space-x-8">
					<a href="/songs" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900">
						Songs
					</a>
					<a href="/songbooks" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900">
						Songbooks
					</a>
					{#if isAdmin}
						<a href="/admin/invites" class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900">
							Invites
						</a>
					{/if}
				</div>
				{#if data.session}
					<div class="flex items-center space-x-4">
						<button
							onclick={() => signOut()}
							class="text-sm text-gray-500 hover:text-gray-900"
						>
							Sign out
						</button>
					</div>
				{/if}
			</div>
		</div>
	</nav>
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>
