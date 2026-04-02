<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import {
    compareSongVersions,
    getPreferredSongVersion,
    parseSongMetadata,
  } from "$lib/songVersions";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import SongVersionEditorForm from "$lib/components/SongVersionEditorForm.svelte";

  let { data, form } = $props();

  let latestVersion = $derived(data.song.versions[0] ?? null);
  let defaultCompareVersionId = $derived(
    data.song.recommendedVersionId &&
      data.song.recommendedVersionId !== latestVersion?.id
      ? data.song.recommendedVersionId
      : data.song.versions[1]?.id || "",
  );
  let showEditModal = $state(false);
  let editingVersion = $state<(typeof data.song.versions)[number] | null>(null);
  let editTitle = $state("");
  let editAuthor = $state("");
  let editContent = $state("");
  let editMetadata = $state<Record<string, string>>({});
  let compareVersionId = $state("");
  let showForkModal = $state(false);
  let forkTitle = $state("");
  let isForking = $state(false);

  $effect(() => {
    if (!compareVersionId || !data.song.versions.some((version) => version.id === compareVersionId)) {
      compareVersionId = defaultCompareVersionId;
    }
  });

  function getLatestVersion() {
    return latestVersion;
  }

  function getRecommendedVersion() {
    return getPreferredSongVersion(data.song);
  }

  function getComparedVersion() {
    return (
      data.song.versions.find((version) => version.id === compareVersionId) ??
      null
    );
  }

  function getComparison() {
    const latestVersion = getLatestVersion();
    const comparedVersion = getComparedVersion();

    if (
      !latestVersion ||
      !comparedVersion ||
      latestVersion.id === comparedVersion.id
    ) {
      return null;
    }

    return compareSongVersions(latestVersion, comparedVersion);
  }

  function isRecommended(versionId: string) {
    return data.song.recommendedVersionId === versionId;
  }

  function refreshOnSuccess(closeModal = false) {
    return async ({ result }: { result: { type: string } }) => {
      if (result.type === "success") {
        if (closeModal) {
          showEditModal = false;
        }
        await invalidateAll();
      }
    };
  }

  function openEdit(versionIndex: number) {
    editingVersion = data.song.versions[versionIndex];
    const parsed = parseSongMetadata(editingVersion.metadata);
    editTitle = editingVersion.title;
    editAuthor = editingVersion.author || "";
    editContent = editingVersion.content;
    editMetadata = parsed;
    showEditModal = true;
  }

  function openFork() {
    forkTitle = getLatestVersion()?.title || "";
    showForkModal = true;
  }

  async function submitFork() {
    isForking = true;
    try {
      const response = await fetch(`/api/songs/${data.song.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: forkTitle }),
      });
      if (!response.ok) {
        throw new Error("Failed to fork song");
      }
      const forkedSong = await response.json();
      window.location.href = `/songs/${forkedSong.id}`;
    } catch (e) {
      console.error("Fork error:", e);
      isForking = false;
    }
  }
</script>

<svelte:head>
  <title>{getLatestVersion()?.title || "Song"} - Songbook</title>
</svelte:head>

<div class="mb-6">
  <a href="/songs" class="text-indigo-600 hover:text-indigo-800 text-sm"
    >&larr; Back to Songs</a
  >
</div>

{#if data.song.isArchived}
  <div class="mb-4 rounded-md bg-gray-100 p-3 text-gray-700">
    This song is archived
  </div>
{/if}

<div class="bg-white shadow rounded-lg overflow-hidden">
  <div class="px-6 py-4 border-b flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        {getLatestVersion()?.title || "Untitled"}
      </h1>
      {#if getLatestVersion()?.author}
        <p class="text-gray-500">{getLatestVersion()?.author}</p>
      {/if}
      {#if (data.song as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
        {@const forked = (data.song as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
        <p class="mt-1 text-sm text-gray-500">
          Forked from <a href="/songs/{forked!.id}" class="text-indigo-600 hover:text-indigo-800">{forked!.versions[0]?.title || 'original'}</a
          >
        </p>
      {/if}
      {#if getRecommendedVersion()}
        <p class="mt-2 text-sm text-gray-600">
          Recommended for reuse and songbook printing:
          <span class="font-medium text-gray-900"
            >{getRecommendedVersion()?.title}</span
          >
          ({new Date(getRecommendedVersion()!.createdAt).toLocaleDateString()})
        </p>
      {/if}
    </div>
    <div class="flex gap-2">
      {#if getLatestVersion() && data.song.recommendedVersionId !== getLatestVersion()!.id}
        <form
          method="POST"
          action="?/clearRecommended"
          use:enhance={() => refreshOnSuccess()}
        >
          <Button variant="secondary" type="submit"
            >Use Latest by Default</Button
          >
        </form>
      {/if}
      <Button onclick={() => openEdit(0)}>Edit Current Version</Button>
      <Button variant="secondary" onclick={openFork}>Fork</Button>
    </div>
  </div>

  {#if getLatestVersion()}
    {@const metadata = parseSongMetadata(getLatestVersion()!.metadata)}
    <div class="px-6 py-4 border-b bg-gray-50">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Created:</span>
          <span class="ml-1"
            >{new Date(
              getLatestVersion()!.createdAt,
            ).toLocaleDateString()}</span
          >
        </div>
        <div>
          <span class="text-gray-500">Status:</span>
          <span class="ml-1"
            >{isRecommended(getLatestVersion()!.id)
              ? "Recommended"
              : "Latest draft"}</span
          >
        </div>
        {#each Object.entries(metadata) as [key, value]}
          {#if value}
            <div>
              <span class="text-gray-500">{key}:</span>
              <span class="ml-1">{value}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <div class="px-6 py-4">
    <pre
      class="whitespace-pre-wrap font-mono text-sm text-gray-800">{getLatestVersion()
        ?.content || ""}</pre>
  </div>
</div>

{#if data.song.versions.length > 1}
  <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <ul class="divide-y divide-gray-200">
          {#each data.song.versions.slice(1) as version, i}
            {@const metadata = parseSongMetadata(version.metadata)}
            <li class="px-6 py-4">
              <div class="flex justify-between items-start gap-4">
                <div>
                  <p class="font-medium text-gray-900">
                    {version.title}
                    {#if isRecommended(version.id)}
                      <span
                        class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                      >
                        Recommended
                      </span>
                    {/if}
                  </p>
                  {#if version.author}
                    <p class="text-sm text-gray-500">{version.author}</p>
                  {/if}
                  <p class="text-sm text-gray-400 mt-1">
                    {new Date(version.createdAt).toLocaleDateString()}
                    {#if metadata.copyright}
                      &bull; {metadata.copyright}{/if}
                  </p>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                  <form
                    method="POST"
                    action="?/setRecommended"
                    use:enhance={() => refreshOnSuccess()}
                  >
                    <input type="hidden" name="versionId" value={version.id} />
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={isRecommended(version.id)}
                    >
                      {isRecommended(version.id)
                        ? "Recommended"
                        : "Mark Recommended"}
                    </Button>
                  </form>
                  <form
                    method="POST"
                    action="?/deleteVersion"
                    use:enhance={() => refreshOnSuccess()}
                  >
                    <input type="hidden" name="versionId" value={version.id} />
                    <Button variant="danger" type="submit">Delete</Button>
                  </form>
                  <Button variant="secondary" onclick={() => openEdit(i + 1)}
                    >View/Edit</Button
                  >
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">
        Version Comparison
      </h2>
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="border-b bg-gray-50 px-6 py-4">
          <label
            class="block text-sm font-medium text-gray-700"
            for="compare-version"
          >
            Compare the latest version with
          </label>
          <select
            id="compare-version"
            bind:value={compareVersionId}
            class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select an older version</option>
            {#each data.song.versions.slice(1) as version}
              <option value={version.id}>
                {version.title} ({new Date(
                  version.createdAt,
                ).toLocaleDateString()})
              </option>
            {/each}
          </select>
        </div>

        <div class="px-6 py-4">
          {#if !getComparison()}
            <p class="text-sm text-gray-500">
              Choose a version to see what changed.
            </p>
          {:else}
            {#if getComparison()!.fieldDifferences.length > 0}
              <div class="mb-6 space-y-3">
                {#each getComparison()!.fieldDifferences as difference}
                  <div class="rounded-md border border-gray-200 p-3">
                    <p class="text-sm font-medium text-gray-900">
                      {difference.field}
                    </p>
                    <p
                      class="mt-1 text-xs uppercase tracking-wide text-red-700"
                    >
                      Latest
                    </p>
                    <p class="text-sm text-gray-700">
                      {difference.currentValue || "Empty"}
                    </p>
                    <p
                      class="mt-2 text-xs uppercase tracking-wide text-emerald-700"
                    >
                      Compared version
                    </p>
                    <p class="text-sm text-gray-700">
                      {difference.comparedValue || "Empty"}
                    </p>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="rounded-md border border-gray-200 overflow-hidden">
              <div
                class="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Content diff
              </div>
              <div class="max-h-[32rem] overflow-auto font-mono text-sm">
                {#each getComparison()!.contentDifferences as line}
                  <div
                    class:text-gray-500={line.type === "same"}
                    class:bg-red-50={line.type === "removed"}
                    class:text-red-800={line.type === "removed"}
                    class:bg-emerald-50={line.type === "added"}
                    class:text-emerald-800={line.type === "added"}
                    class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 py-1"
                  >
                    <span
                      >{line.type === "removed"
                        ? "-"
                        : line.type === "added"
                          ? "+"
                          : " "}</span
                    >
                    <span class="whitespace-pre-wrap break-words"
                      >{line.value || " "}</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<Modal
  bind:open={showEditModal}
  title="Edit Song Version"
  onclose={() => (showEditModal = false)}
  fullscreen
>
  {#snippet children()}
    <SongVersionEditorForm
      action="?/update"
      error={form?.error}
      bind:title={editTitle}
      bind:author={editAuthor}
      bind:content={editContent}
      bind:metadata={editMetadata}
      submitLabel="Save Version"
      onCancel={() => (showEditModal = false)}
      enhanceSubmit={() => refreshOnSuccess(true)}
    />
  {/snippet}
</Modal>

<Modal bind:open={showForkModal} title="Fork Song" onclose={() => (showForkModal = false)}>
  {#snippet children()}
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Create a copy of this song that you can edit independently.
      </p>
      <div>
        <label for="fork-title" class="block text-sm font-medium text-gray-700">
          New Song Title
        </label>
        <input
          id="fork-title"
          type="text"
          bind:value={forkTitle}
          class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <div class="flex justify-end gap-2">
        <Button variant="secondary" onclick={() => (showForkModal = false)}>Cancel</Button>
        <Button onclick={submitFork} disabled={isForking || !forkTitle.trim()}>
          {isForking ? "Forking..." : "Fork Song"}
        </Button>
      </div>
    </div>
  {/snippet}
</Modal>
