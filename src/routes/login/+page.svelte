<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleCredentials(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const result = await signIn('credentials', {
			email,
			password,
			redirect: false
		});

		loading = false;

		if (result?.error) {
			error = 'Invalid email, username, or password.';
		} else {
			window.location.href = '/songs';
		}
	}


</script>

<svelte:head>
	<title>Login – Songbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">Sign in</h1>
			<p class="mt-2 text-gray-600">Access your songbooks</p>
		</div>

		{#if data.setup}
			<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
				Admin account created. You can now sign in.
			</div>
		{/if}

		<div class="bg-white shadow rounded-lg p-8 space-y-6">
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			{/if}

			<div class="text-center text-sm">
				<a href="/impressum" class="text-blue-600 hover:text-blue-700">Impressum</a>
			</div>

			<form onsubmit={handleCredentials} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
					<input
						id="email"
						type="text"
						bind:value={email}
						required
						autocomplete="username"
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
				>
					{loading ? 'Signing in…' : 'Sign in'}
				</button>
			</form>


		</div>
	</div>
</div>
