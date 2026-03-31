<script lang="ts">
  let { data } = $props();

  let step = $derived(data.step);
  let email = $derived(data.email || "");
  let token = $derived(data.token || "");

  let name = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);
  let verifyLoading = $state(false);

  async function handleVerify(e: SubmitEvent) {
    e.preventDefault();
    verifyLoading = true;
    error = "";

    try {
      const res = await fetch("/api/invites/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (!res.ok) {
        error = result.message || "Verification failed";
      } else {
        window.location.reload();
      }
    } catch {
      error = "Something went wrong";
    } finally {
      verifyLoading = false;
    }
  }

  async function handleSignup(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = "";

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        error = result.message || "Signup failed";
      } else {
        window.location.href = "/login?setup=1";
      }
    } catch {
      error = "Something went wrong";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign up – Songbook</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900">Sign up</h1>
      <p class="mt-2 text-gray-600">
        {step === "verify" ? "Verify your email to continue" : "Create your account"}
      </p>
    </div>

    {#if data.error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {data.error}
      </div>
    {/if}

    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {/if}

    {#if step === "verify"}
      <div class="bg-white shadow rounded-lg p-8 space-y-6">
        <p class="text-gray-600">
          An invitation has been sent to <strong>{email}</strong>. Please verify your email
          to continue.
        </p>

        <form onsubmit={handleVerify}>
          <button
            type="submit"
            disabled={verifyLoading}
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {verifyLoading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
      </div>
    {:else if step === "signup"}
      <form onsubmit={handleSignup} class="bg-white shadow rounded-lg p-8 space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1"
            >Email</label
          >
          <input
            id="email"
            type="email"
            value={email}
            disabled
            class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
          />
        </div>

        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label
          >
          <input
            id="name"
            type="text"
            bind:value={name}
            required
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1"
            >Password</label
          >
          <input
            id="password"
            type="password"
            bind:value={password}
            required
            minlength="8"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    {:else}
      <div class="bg-white shadow rounded-lg p-8">
        <p class="text-gray-600">{data.error || "Invalid invite"}</p>
      </div>
    {/if}
  </div>
</div>
