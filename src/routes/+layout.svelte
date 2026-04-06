<script lang="ts">
  import "../app.css";
  import { signOut } from "@auth/sveltekit/client";

  let { children, data } = $props();

  type AuthUser = {
    id: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
    name?: string | null;
  };

  const user = $derived(data.session?.user as AuthUser | undefined);
  let isAdmin = $derived(user?.role === "ADMIN");
  let isMenuOpen = $state(false);
  let menuRef = $state<HTMLDivElement | null>(null);
  let communityMenuOpen = $state(false);
  let communityRef = $state<HTMLDivElement | null>(null);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (menuRef && !menuRef.contains(target)) {
      isMenuOpen = false;
    }
    if (communityRef && !communityRef.contains(target)) {
      communityMenuOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="min-h-screen bg-gray-50 flex flex-col">
  <nav class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center gap-1 sm:gap-6 flex-wrap">
          <a
            href="/songs"
            class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
          >
            Songs
          </a>
          <a
            href="/songbooks"
            class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            Songbooks
          </a>
          <div class="relative" bind:this={communityRef}>
            <button
              type="button"
              onclick={() => (communityMenuOpen = !communityMenuOpen)}
              class="inline-flex items-center gap-1 px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              aria-expanded={communityMenuOpen}
              aria-haspopup="true"
            >
              Community
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {#if communityMenuOpen}
              <div
                class="absolute left-0 mt-2 w-52 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
                role="menu"
              >
                <a
                  href="/people"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onclick={() => (communityMenuOpen = false)}>People</a
                >
                <a
                  href="/shared"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                  onclick={() => (communityMenuOpen = false)}>Shared with me</a
                >
              </div>
            {/if}
          </div>
          {#if isAdmin}
            <a
              href="/admin"
              class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Admin
            </a>
          {/if}
        </div>
        {#if user}
          <div class="relative shrink-0" bind:this={menuRef}>
            <button
              onclick={() => (isMenuOpen = !isMenuOpen)}
              class="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <span
                >{user.firstName
                  ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                  : (user.username ?? user.email ?? "User")}</span
              >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {#if isMenuOpen}
              <div
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
              >
                <a
                  href="/settings"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </a>
                <button
                  onclick={() => signOut()}
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </nav>
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>
  <footer class="border-t border-gray-200 bg-white py-4 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
      <a href="/impressum" class="hover:text-gray-900">Impressum</a>
    </div>
  </footer>
</div>
