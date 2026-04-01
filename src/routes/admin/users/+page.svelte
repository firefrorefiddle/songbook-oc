<script lang="ts">
  import { enhance } from "$app/forms";

  let { data, form } = $props();

  let search = $state("");

  const filteredUsers = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return data.users;
    }

    return data.users.filter((user) =>
      [user.displayName, user.email, user.username ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  });

  let signupUrl = $derived(form?.signupUrl ?? "");
  let fullSignupUrl = $derived(
    typeof window !== "undefined" && signupUrl ? `${window.location.origin}${signupUrl}` : signupUrl,
  );

  async function copySignupUrl() {
    if (!fullSignupUrl) return;
    await navigator.clipboard.writeText(fullSignupUrl);
  }
</script>

<svelte:head>
  <title>Admin Users – Songbook</title>
</svelte:head>

<div class="space-y-8">
  <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Admin user management</h1>
      <p class="mt-1 text-sm text-gray-600">
        Browse accounts, manage active access, inspect invite state, and review collaboration footprint.
      </p>
    </div>

    <label class="block w-full md:w-80">
      <span class="mb-1 block text-sm font-medium text-gray-700">Search users</span>
      <input
        bind:value={search}
        type="search"
        placeholder="Name, email, or username"
        class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  </section>

  {#if form?.error}
    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {form.error}
    </div>
  {/if}

  {#if form?.success && form?.signupUrl}
    <div class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      Invite for {form.inviteEmail} was refreshed.
      <button type="button" class="ml-2 font-medium underline" onclick={copySignupUrl}>Copy signup link</button>
    </div>
  {/if}

  <section class="grid gap-4 md:grid-cols-4">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Users</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">{data.users.length}</p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Active</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {data.users.filter((user) => user.isActive).length}
      </p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Pending invites</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">{data.invites.length}</p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Verified invites</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {data.invites.filter((invite) => invite.status === "verified").length}
      </p>
    </div>
  </section>

  <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div class="border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">Users</h2>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Verification</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Footprint</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each filteredUsers as user}
            <tr>
              <td class="px-6 py-4 align-top text-sm text-gray-700">
                <div class="font-medium text-gray-900">{user.displayName}</div>
                <div>{user.email}</div>
                {#if user.username}
                  <div class="text-gray-500">@{user.username}</div>
                {/if}
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">{user.role}</td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                {#if user.verificationState === "verified"}
                  <span class="text-green-700">Verified</span>
                {:else if user.verificationState === "not_verified"}
                  <span class="text-yellow-700">Not verified</span>
                {:else}
                  <span class="text-gray-500">Not applicable</span>
                {/if}
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                <div>{user.ownedSongsCount} songs owned</div>
                <div>{user.ownedSongbooksCount} songbooks owned</div>
                <div>{user.collaborationsCount} collaborations</div>
                <div>{user.invitesSentCount} invites sent</div>
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                {#if user.isActive}
                  <span class="font-medium text-green-700">Active</span>
                {:else}
                  <span class="font-medium text-red-700">Deactivated</span>
                  {#if user.deactivatedAt}
                    <div class="text-gray-500">
                      {new Date(user.deactivatedAt).toLocaleDateString()}
                    </div>
                  {/if}
                {/if}
              </td>
              <td class="px-6 py-4 align-top text-right text-sm">
                <form method="POST" action="?/toggleActive" use:enhance>
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    type="hidden"
                    name="nextState"
                    value={user.isActive ? "deactivate" : "activate"}
                  />
                  <button
                    type="submit"
                    class={user.isActive
                      ? "font-medium text-red-700 hover:text-red-900"
                      : "font-medium text-blue-700 hover:text-blue-900"}
                  >
                    {user.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </td>
            </tr>
          {/each}

          {#if filteredUsers.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                No users match the current search.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div class="border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">Pending invites</h2>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">State</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sent by</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Shared items</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expires</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each data.invites as invite}
            <tr>
              <td class="px-6 py-4 text-sm text-gray-700">{invite.email}</td>
              <td class="px-6 py-4 text-sm text-gray-600">{invite.role}</td>
              <td class="px-6 py-4 text-sm">
                {#if invite.status === "verified"}
                  <span class="text-green-700">Verified</span>
                {:else if invite.status === "expired"}
                  <span class="text-red-700">Expired</span>
                {:else}
                  <span class="text-yellow-700">Pending verification</span>
                {/if}
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">{invite.sentByName}</td>
              <td class="px-6 py-4 text-sm text-gray-600">{invite.sharedItemsCount}</td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {new Date(invite.expiresAt).toLocaleDateString()}
              </td>
              <td class="px-6 py-4 text-right text-sm">
                <form method="POST" action="?/resendInvite" use:enhance>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <button type="submit" class="font-medium text-blue-700 hover:text-blue-900">
                    Resend
                  </button>
                </form>
              </td>
            </tr>
          {/each}

          {#if data.invites.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-8 text-center text-sm text-gray-500">
                No pending invites.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>
