<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let token = $derived(data.token ?? '');
</script>

<svelte:head>
  <title>Reset Password – Songbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900">Reset password</h1>
      <p class="mt-2 text-gray-600">
        {data.step === 'reset'
          ? 'Choose a new password for your account.'
          : 'Request a new reset link to continue.'}
      </p>
    </div>

    {#if data.step === 'reset'}
      <form method="POST" use:enhance class="bg-white shadow rounded-lg p-8 space-y-6">
        {#if form?.resetError}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {form.resetError}
          </div>
        {/if}

        <input type="hidden" name="token" value={token} />

        <div>
          <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
        >
          Reset password
        </button>
      </form>
    {:else}
      <div class="bg-white shadow rounded-lg p-8 space-y-6">
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {data.error}
        </div>

        <a
          href="/forgot-password"
          class="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
        >
          Request new reset link
        </a>
      </div>
    {/if}
  </div>
</div>
