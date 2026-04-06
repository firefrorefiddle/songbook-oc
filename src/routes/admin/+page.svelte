<script lang="ts">
  /** Admin hub: one entry point for operational tools (replaces four separate nav links). */
</script>

<svelte:head>
  <title>Admin - Songbook</title>
</svelte:head>

<div class="max-w-3xl">
  <h1 class="text-2xl font-bold text-gray-900 mb-2">Administration</h1>
  <p class="text-sm text-gray-600 mb-8">
    User accounts, invites, mail delivery, and activity. Each area opens in full; use your
    browser back button or the main navigation to return here.
  </p>

  <ul class="grid gap-4 sm:grid-cols-2">
    <li>
      <a
        href="/admin/users"
        class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
      >
        <span class="text-base font-semibold text-gray-900">Users</span>
        <span class="mt-1 block text-sm text-gray-500"
          >Browse accounts, activation, invites, collaboration</span
        >
      </a>
    </li>
    <li>
      <a
        href="/admin/invites"
        class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
      >
        <span class="text-base font-semibold text-gray-900">Invites</span>
        <span class="mt-1 block text-sm text-gray-500">Create and manage registration invites</span>
      </a>
    </li>
    <li>
      <a
        href="/admin/email-deliveries"
        class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
      >
        <span class="text-base font-semibold text-gray-900">Mail</span>
        <span class="mt-1 block text-sm text-gray-500">Transactional email delivery audit</span>
      </a>
    </li>
    <li>
      <a
        href="/admin/activity"
        class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
      >
        <span class="text-base font-semibold text-gray-900">Activity</span>
        <span class="mt-1 block text-sm text-gray-500">Recent actions across the app</span>
      </a>
    </li>
  </ul>
</div>
