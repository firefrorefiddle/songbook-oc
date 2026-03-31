<script lang="ts">
  import { enhance } from "$app/forms";

  let { data, form: formAction } = $props();

  let email = $state("");
  let role = $state("USER");
  let showCreate = $state(false);
</script>

<svelte:head>
  <title>Manage Invites – Songbook</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-8 px-4">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-2xl font-bold text-gray-900">Manage Invites</h1>
    <button
      onclick={() => (showCreate = !showCreate)}
      class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
    >
      {showCreate ? "Cancel" : "Send Invite"}
    </button>
  </div>

  {#if showCreate}
    <form
      method="POST"
      action="?/create"
      use:enhance={() => {
        return async ({ update }) => {
          await update();
          if (formAction?.success) {
            email = "";
            showCreate = false;
          }
        };
      }}
      class="bg-white shadow rounded-lg p-6 mb-8"
    >
      {#if formAction?.error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {formAction.error}
        </div>
      {/if}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1"
            >Email Address</label
          >
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="role" class="block text-sm font-medium text-gray-700 mb-1"
            >Role</label
          >
          <select
            id="role"
            name="role"
            bind:value={role}
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
          >
            Send Invite
          </button>
        </div>
      </div>
    </form>
  {/if}

  <div class="bg-white shadow rounded-lg overflow-hidden">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Email</th
          >
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Role</th
          >
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Status</th
          >
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Sent By</th
          >
          <th
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Expires</th
          >
          <th class="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        {#each data.invites as invite}
          <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {invite.email}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {invite.role}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
              {#if invite.usedAt}
                <span class="text-green-600">Used</span>
              {:else if invite.emailVerifiedAt}
                <span class="text-blue-600">Verified</span>
              {:else if invite.expiresAt < new Date()}
                <span class="text-red-600">Expired</span>
              {:else}
                <span class="text-yellow-600">Pending</span>
              {/if}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {invite.sentBy.name || invite.sentBy.email}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {new Date(invite.expiresAt).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
              {#if !invite.usedAt}
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={invite.id} />
                  <button
                    type="submit"
                    class="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </form>
              {/if}
            </td>
          </tr>
        {/each}

        {#if data.invites.length === 0}
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
              No invites yet. Send one to get started.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>
