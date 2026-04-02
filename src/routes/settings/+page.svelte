<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<div class="max-w-2xl">
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

	<div class="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
		<h2 class="text-lg font-medium text-gray-900 mb-4">Account</h2>

		<form method="POST" use:enhance class="space-y-4">
			{#if form?.error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{form.error}
				</div>
			{/if}

			{#if form?.success}
				<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
					Settings updated successfully.
				</div>
			{/if}

			<div>
				<label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
				<input
					id="firstName"
					name="firstName"
					type="text"
					required
					value={form?.fields?.firstName ?? data.user?.firstName ?? ''}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
				<input
					id="lastName"
					name="lastName"
					type="text"
					required
					value={form?.fields?.lastName ?? data.user?.lastName ?? ''}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="username" class="block text-sm font-medium text-gray-700 mb-1">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					required
					value={form?.fields?.username ?? data.user?.username ?? ''}
					class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					disabled
					value={data.user?.email ?? ''}
					class="w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
				/>
				<p class="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
			</div>

			<div>
				<label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
				<input
					id="role"
					type="text"
					disabled
					value={data.user?.role ?? ''}
					class="w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
				/>
			</div>

			<button
				type="submit"
				class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
			>
				Save Changes
			</button>
		</form>
	</div>

	{#if data.user?.hasPassword}
		<div class="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">Change Password</h2>

			<form method="POST" action="?/changePassword" use:enhance class="space-y-4">
				{#if form?.passwordError}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
						{form.passwordError}
					</div>
				{/if}

				{#if form?.passwordSuccess}
					<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
						Password changed successfully.
					</div>
				{/if}

				<div>
					<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
					<input
						id="currentPassword"
						name="currentPassword"
						type="password"
						required
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
					<input
						id="newPassword"
						name="newPassword"
						type="password"
						required
						minlength="8"
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						minlength="8"
						class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<button
					type="submit"
					class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
				>
					Change Password
				</button>
			</form>
		</div>
	{:else}
		<div class="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">Password</h2>
			<p class="text-gray-600">You signed up with Google, so you don't have a password. Contact an admin if you need one set.</p>
		</div>
	{/if}
</div>
