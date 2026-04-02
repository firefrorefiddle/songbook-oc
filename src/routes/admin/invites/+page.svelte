<script lang="ts">
  import { enhance } from "$app/forms";

  let { data, form: formAction } = $props();

  let email = $state("");
  let role = $state("USER");
  let showCreate = $state(false);
  let showLinkModal = $state(false);
  let copied = $state(false);

  // Each entry represents "share all <resourceType>s owned by <ownerId>"
  type CollabEntry = { ownerId: string; resourceType: "song" | "songbook" };
  let collabs = $state<CollabEntry[]>([]);

  let signupUrl = $derived(formAction?.success ? formAction.signupUrl : "");
  let fullUrl = $derived(formAction?.success ? signupUrl : "");
  let emailStatus = $derived(formAction?.success ? formAction.emailStatus : null);
  let emailTransport = $derived(formAction?.success ? formAction.emailTransport : null);
  let emailError = $derived(formAction?.success ? formAction.emailError : null);

  function copyLink() {
    if (fullUrl) {
      navigator.clipboard.writeText(fullUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }

  function addCollab() {
    // Default to the first user and "song" as a starting point
    const firstUser = data.users[0];
    if (!firstUser) return;
    collabs = [...collabs, { ownerId: firstUser.id, resourceType: "song" }];
  }

  function removeCollab(index: number) {
    collabs = collabs.filter((_, i) => i !== index);
  }

  // Reset local state after successful creation
  $effect(() => {
    if (formAction?.success) {
      email = "";
      role = "USER";
      collabs = [];
    }
  });
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
            showCreate = false;
            showLinkModal = true;
          }
        };
      }}
      class="bg-white shadow rounded-lg p-6 mb-8 space-y-6"
    >
      {#if formAction?.error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {formAction.error}
        </div>
      {/if}

      <!-- Email + Role -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
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
          <label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
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
      </div>

      <!-- Share Content section -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-medium text-gray-700">Share Content</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Grant the invited user editor access to existing songs or songbooks upon sign-up.
            </p>
          </div>
          {#if data.users.length > 0}
            <button
              type="button"
              onclick={addCollab}
              class="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add
            </button>
          {/if}
        </div>

        {#if data.users.length === 0}
          <p class="text-sm text-gray-400 italic">No users yet — nothing to share.</p>
        {:else if collabs.length === 0}
          <p class="text-sm text-gray-400 italic">No content shared. Click "+ Add" to share.</p>
        {:else}
          <div class="space-y-2">
            {#each collabs as entry, i}
              <!-- Hidden inputs serialise the collab arrays to the server -->
              <input type="hidden" name="collab_ownerId" value={entry.ownerId} />
              <input type="hidden" name="collab_resourceType" value={entry.resourceType} />

              <div class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                <div class="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label for={`collab-owner-${i}`} class="block text-xs text-gray-500 mb-1">Owner</label>
                    <select
                      id={`collab-owner-${i}`}
                      class="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      bind:value={entry.ownerId}
                    >
                      {#each data.users as user}
                        <option value={user.id}>{user.name ?? user.email}</option>
                      {/each}
                    </select>
                  </div>

                  <div>
                    <label for={`collab-resource-${i}`} class="block text-xs text-gray-500 mb-1">Resource</label>
                    <select
                      id={`collab-resource-${i}`}
                      class="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      bind:value={entry.resourceType}
                    >
                      <option value="song">All songs</option>
                      <option value="songbook">All songbooks</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onclick={() => removeCollab(i)}
                  class="text-gray-400 hover:text-red-500 text-lg leading-none mt-3"
                  aria-label="Remove"
                >
                  &times;
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          class="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-medium"
        >
          Send Invite
        </button>
      </div>
    </form>
  {/if}

  <!-- Invite table -->
  <div class="bg-white shadow rounded-lg overflow-hidden">
    <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared Content</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
          <th class="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        {#each data.invites as invite}
          <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invite.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invite.role}</td>
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
            <td class="px-6 py-4 text-sm text-gray-500">
              {#if invite.inviteCollaborations.length === 0}
                <span class="text-gray-400 italic">None</span>
              {:else}
                <ul class="space-y-0.5">
                  {#each invite.inviteCollaborations as ic}
                    <li>
                      All {ic.resourceType === "song" ? "songs" : "songbooks"} by
                      <span class="font-medium text-gray-700">{ic.owner.name ?? ic.owner.email}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {new Date(invite.expiresAt).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
              {#if !invite.usedAt}
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={invite.id} />
                  <button type="submit" class="text-red-600 hover:text-red-800 font-medium">
                    Delete
                  </button>
                </form>
              {/if}
            </td>
          </tr>
        {/each}

        {#if data.invites.length === 0}
          <tr>
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
              No invites yet. Send one to get started.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
    </div>
  </div>
</div>

{#if showLinkModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Invite Created</h2>
      {#if emailStatus === "SENT" && emailTransport === "sendmail"}
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          <p class="text-sm">
            <strong>Email sent.</strong> The invitation email was handed off to the configured sendmail transport.
          </p>
        </div>
      {:else if emailStatus === "SENT" && emailTransport === "mailgun"}
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
          <p class="text-sm">
            <strong>Email sent.</strong> The invitation email was sent via the configured mail provider.
          </p>
        </div>
      {:else if emailStatus === "SENT" && emailTransport === "log"}
        <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <p class="text-sm">
            <strong>Log transport active.</strong> The email was captured locally instead of being delivered.
            Share the signup link manually or inspect the logged `.eml` file in `storage/emails/`.
          </p>
        </div>
      {:else}
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          <p class="text-sm">
            <strong>Email delivery failed.</strong> Share the signup link manually for now.
            {#if emailError}
              {emailError}
            {/if}
          </p>
        </div>
      {/if}
      <div class="mb-4">
        <label for="signup-link" class="block text-sm font-medium text-gray-700 mb-1">
          Signup Link
        </label>
        <div class="flex gap-2">
          <input
            id="signup-link"
            type="text"
            readonly
            value={fullUrl}
            class="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm"
          />
          <button
            type="button"
            onclick={copyLink}
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          onclick={() => (showLinkModal = false)}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
        >
          Done
        </button>
      </div>
    </div>
  </div>
{/if}
