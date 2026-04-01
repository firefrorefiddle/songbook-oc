<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<svelte:head>
  <title>Forgot Password – Songbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900">Forgot password</h1>
      <p class="mt-2 text-gray-600">Enter your email address to request a reset link.</p>
    </div>

    <form method="POST" use:enhance class="bg-white shadow rounded-lg p-8 space-y-6">
      {#if form?.success}
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {form.success}
        </div>
      {/if}

      {#if form?.error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {form.error}
        </div>
      {/if}

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form?.fields?.email ?? ''}
          required
          autocomplete="email"
          class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
      >
        Send reset link
      </button>

      <div class="text-center text-sm">
        <a href="/login" class="text-blue-600 hover:text-blue-700">Back to sign in</a>
      </div>
    </form>
  </div>
</div>
