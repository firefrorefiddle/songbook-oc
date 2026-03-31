<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Setup – Songbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">Welcome to Songbook</h1>
			<p class="mt-2 text-gray-600">Create the first admin account to get started.</p>
		</div>

		<form method="POST" use:enhance class="bg-white shadow rounded-lg p-8 space-y-6">
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{form.error}
				</div>
			{/if}

			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					value={form?.fields?.name ?? ''}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					value={form?.fields?.email ?? ''}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					minlength="8"
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
			</div>

			<button
				type="submit"
				class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
			>
				Create Admin Account
			</button>
		</form>
	</div>
</div>
