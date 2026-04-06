<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import type { ActionResult } from "@sveltejs/kit";
  import {
    collaborationUiCopy,
    collaboratorRoleLabel,
  } from "$lib/collaborationUiCopy";
  import { getPreferredSongVersion } from "$lib/songVersions";
  import Button from "$lib/components/Button.svelte";
  import Input from "$lib/components/Input.svelte";
  import Modal from "$lib/components/Modal.svelte";

  let { data, form } = $props();

  let showAddSongModal = $state(false);
  let showNewVersionModal = $state(false);
  let selectedSongVersionIds = $state<string[]>([]);
  let songSearchQuery = $state("");
  let selectedTagId = $state("");
  let selectedCategoryId = $state("");
  let versionTitle = $state("");
  let versionDescription = $state("");
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);

  $effect(() => {
    selectedTagId = data.tagId ?? "";
    selectedCategoryId = data.categoryId ?? "";
  });

  function applySongPickerFilters() {
    const params = new URLSearchParams();
    if (selectedTagId) params.set("tag", selectedTagId);
    if (selectedCategoryId) params.set("category", selectedCategoryId);
    const q = params.toString();
    goto(`/songbooks/${data.songbook.id}${q ? `?${q}` : ""}`, {
      keepFocus: true,
      noScroll: true,
    });
  }

  function getCurrentVersion() {
    return data.songbook.versions[0];
  }

  function getDisplayedSongVersion(song: (typeof data.availableSongs)[number]) {
    return getPreferredSongVersion(song);
  }

  function fuzzyMatch(text: string, pattern: string): boolean {
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    let patternIdx = 0;
    for (
      let i = 0;
      i < textLower.length && patternIdx < patternLower.length;
      i++
    ) {
      if (textLower[i] === patternLower[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === patternLower.length;
  }

  function getFilteredSongs() {
    if (!songSearchQuery.trim()) {
      return data.availableSongs;
    }
    const query = songSearchQuery.trim();
    return data.availableSongs.filter((song) => {
      const displayedVersion = getDisplayedSongVersion(song);
      if (!displayedVersion) return false;
      const titleMatch = fuzzyMatch(displayedVersion.title, query);
      const authorMatch = displayedVersion.author
        ? fuzzyMatch(displayedVersion.author, query)
        : false;
      return titleMatch || authorMatch;
    });
  }

  function toggleSong(songVersionId: string) {
    if (selectedSongVersionIds.includes(songVersionId)) {
      selectedSongVersionIds = selectedSongVersionIds.filter(
        (id) => id !== songVersionId,
      );
    } else {
      selectedSongVersionIds = [...selectedSongVersionIds, songVersionId];
    }
  }

  function toggleAll(checked: boolean) {
    const filtered = getFilteredSongs();
    const versionIds = filtered
      .map((song) => getDisplayedSongVersion(song)?.id)
      .filter((id): id is string => Boolean(id));
    if (checked) {
      const existing = new Set(selectedSongVersionIds);
      selectedSongVersionIds = [
        ...selectedSongVersionIds,
        ...versionIds.filter((id) => !existing.has(id)),
      ];
    } else {
      selectedSongVersionIds = selectedSongVersionIds.filter(
        (id) => !versionIds.includes(id),
      );
    }
  }

  function isAllSelected() {
    const filtered = getFilteredSongs();
    const versionIds = filtered
      .map((song) => getDisplayedSongVersion(song)?.id)
      .filter((id): id is string => Boolean(id));
    return (
      versionIds.length > 0 &&
      versionIds.every((id) => selectedSongVersionIds.includes(id))
    );
  }

  function handleDragStart(event: DragEvent, index: number) {
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", index.toString());
    }
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    dragOverIndex = null;
    if (draggedIndex === null || draggedIndex === targetIndex) {
      draggedIndex = null;
      return;
    }

    const songs = [...(getCurrentVersion()?.songs || [])];
    const [removed] = songs.splice(draggedIndex, 1);
    songs.splice(targetIndex, 0, removed);

    const songVersionIds = songs.map((song) => song.songVersion.id);

    const form = document.getElementById("reorder-form") as HTMLFormElement;
    if (!form) return;

    const inputs = form.querySelectorAll('input[name="songVersionIds"]');
    inputs.forEach((input, i) => {
      (input as HTMLInputElement).value = songVersionIds[i];
    });

    form.requestSubmit();

    draggedIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  let isGeneratingPdf = $state(false);
  let isDownloadingPdf = $state(false);
  let showForkModal = $state(false);
  let forkTitle = $state("");
  let isForking = $state(false);
  let showSettingsModal = $state(false);
  let showCollabModal = $state(false);
  let selectedUserId = $state("");
  let selectedRole = $state<"EDITOR" | "ADMIN">("EDITOR");
  let availableUsers = $state<
    { id: string; displayName: string; email: string }[]
  >([]);

  let outputMode = $state("chorded");
  let outputFontSize = $state("medium");
  let outputPaperSize = $state("a4");

  function openSettings() {
    const settings = JSON.parse(data.songbook.outputSettings || "{}");
    outputMode = settings.mode || "chorded";
    outputFontSize = settings.fontSize || "medium";
    outputPaperSize = settings.paperSize || "a4";
    showSettingsModal = true;
  }

  async function generatePdf() {
    if (isGeneratingPdf) return;
    isGeneratingPdf = true;
    try {
      const response = await fetch(
        `/api/songbooks/${data.songbook.id}/pdf/generate`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        const err = await response.text();
        alert(`Failed to generate PDF: ${err}`);
        return;
      }
      await invalidateAll();
    } finally {
      isGeneratingPdf = false;
    }
  }

  async function downloadPdf() {
    if (isDownloadingPdf) return;
    isDownloadingPdf = true;
    try {
      const response = await fetch(`/api/songbooks/${data.songbook.id}/pdf`);
      if (!response.ok) {
        alert("PDF not available. Please generate it first.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getCurrentVersion()?.title || "songbook"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      isDownloadingPdf = false;
    }
  }

  async function viewLog() {
    const response = await fetch(`/api/songbooks/${data.songbook.id}/pdf/log`);
    if (!response.ok) {
      alert("Log not available");
      return;
    }
    const logContent = await response.text();
    const logWindow = window.open("", "_blank");
    if (logWindow) {
      logWindow.document.write(`<pre>${logContent}</pre>`);
    }
  }

  function openFork() {
    forkTitle = getCurrentVersion()?.title || "";
    showForkModal = true;
  }

  async function openCollabModal() {
    const response = await fetch("?/loadUsers", { method: "POST" });
    const result = await response.json();
    if (result.type === "success") {
      availableUsers = result.data.users.filter(
        (u: { id: string }) =>
          u.id !== data.owner.id &&
          !data.collaborators.some((c: { id: string }) => c.id === u.id),
      );
    }
    showCollabModal = true;
  }

  function refreshSharing(closeModal = false) {
    return async ({ result }: { result: ActionResult }) => {
      if (result.type === "success") {
        if (closeModal) {
          showCollabModal = false;
        }
        await invalidateAll();
      }
    };
  }

  async function submitFork() {
    isForking = true;
    try {
      const response = await fetch(`/api/songbooks/${data.songbook.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: forkTitle }),
      });
      if (!response.ok) {
        throw new Error("Failed to fork songbook");
      }
      const forkedSongbook = await response.json();
      window.location.href = `/songbooks/${forkedSongbook.id}`;
    } catch (e) {
      console.error("Fork error:", e);
      isForking = false;
    }
  }
</script>

<svelte:head>
  <title>{getCurrentVersion()?.title || "Songbook"} - Songbook</title>
</svelte:head>

<div class="mb-6">
  <a href="/songbooks" class="text-indigo-600 hover:text-indigo-800 text-sm"
    >&larr; Back to Songbooks</a
  >
</div>

{#if data.songbook.isArchived}
  <div class="mb-4 p-3 bg-gray-100 text-gray-700 rounded-md">
    This songbook is archived
  </div>
{/if}

<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
  <div class="px-6 py-4 border-b flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">
        {getCurrentVersion()?.title || "Untitled"}
      </h1>
      {#if getCurrentVersion()?.description}
        <p class="text-gray-500 mt-1">{getCurrentVersion().description}</p>
      {/if}
      {#if (data.songbook as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
        {@const forked = (data.songbook as { forkedFrom?: { id: string; versions: { title: string }[] } }).forkedFrom}
        <p class="mt-1 text-sm text-gray-500">
          Forked from <a href="/songbooks/{forked!.id}" class="text-indigo-600 hover:text-indigo-800">{forked!.versions[0]?.title || "original"}</a
          >
        </p>
      {/if}
      <div class="mt-3 space-y-1 text-sm text-gray-600" aria-label="Sharing">
        <p>
          <span class="font-medium text-gray-700">Owner:</span>
          {data.owner.displayName}
          <span class="text-gray-500">({data.owner.email})</span>
        </p>
        <p class="text-xs text-gray-500">{collaborationUiCopy.ownerBlurb}</p>
        {#if data.collaborators.length > 0}
          <p>
            <span class="font-medium text-gray-700">Collaborators:</span>
            {data.collaborators.map((c) => `${c.displayName} (${collaboratorRoleLabel(c.role)})`).join(", ")}
          </p>
          <p class="text-xs text-gray-500">{collaborationUiCopy.editorSongbookBlurb}</p>
        {:else}
          <p class="text-xs text-gray-500">No collaborators yet.</p>
        {/if}
        <p class="text-xs">
          <a href="/people" class="text-indigo-600 hover:text-indigo-800 underline"
            >{collaborationUiCopy.findPeopleLinkText}</a
          >
          <span class="text-gray-500"> — {collaborationUiCopy.songbookSharingBlurb}</span>
        </p>
        {#if !data.isOwner && data.yourCollabRole}
          <p class="mt-2 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900" role="status">
            You are a collaborator with the {collaboratorRoleLabel(data.yourCollabRole)} role on this songbook.
            Only the owner can add or remove access.
          </p>
        {/if}
      </div>
    </div>
    <div class="flex flex-wrap gap-2 justify-end items-center">
      {#if getCurrentVersion()?.songs.length}
        <Button variant="secondary" onclick={() => goto(`/songbooks/${data.songbook.id}/present`)}
          >Present</Button
        >
      {/if}
      <details class="relative group">
        <summary
          class="list-none cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 [&::-webkit-details-marker]:hidden"
        >
          <span class="inline-flex items-center gap-1">
            PDF
            <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </summary>
        <div
          class="absolute right-0 z-30 mt-1 w-60 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGeneratingPdf || !getCurrentVersion()?.songs.length}
            onclick={() => generatePdf()}
          >
            {isGeneratingPdf ? "Generating…" : "Generate PDF"}
          </button>
          {#if getCurrentVersion()?.pdfPath}
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDownloadingPdf || !getCurrentVersion()?.songs.length}
              onclick={() => downloadPdf()}
            >
              {isDownloadingPdf ? "Downloading…" : "Download PDF"}
              {#if getCurrentVersion()?.pdfGeneratedAt}
                <span class="mt-0.5 block text-xs text-gray-500">
                  Built {new Date(getCurrentVersion()!.pdfGeneratedAt!).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              {/if}
            </button>
          {/if}
          {#if getCurrentVersion()?.pdfLogPath}
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onclick={() => viewLog()}
            >
              View build log
            </button>
          {/if}
          {#if !getCurrentVersion()?.songs.length}
            <p class="px-4 py-2 text-xs text-gray-500">Add songs to generate a PDF.</p>
          {/if}
        </div>
      </details>
      <Button onclick={() => (showAddSongModal = true)}>Add Song</Button>
      <Button variant="secondary" onclick={() => (showNewVersionModal = true)}
        >New Version</Button
      >
      <Button variant="secondary" onclick={openFork}>Fork</Button>
      {#if data.isOwner}
        <Button variant="secondary" onclick={openCollabModal}>Sharing</Button>
      {/if}
      <Button variant="secondary" onclick={openSettings}>Settings</Button>
    </div>
  </div>

  <div class="px-6 py-4 border-b bg-gray-50">
    <div class="text-sm text-gray-500">
      {getCurrentVersion()?.songs.length || 0} songs in this version &bull; Created
      {getCurrentVersion()?.createdAt
        ? new Date(getCurrentVersion()!.createdAt!).toLocaleDateString()
        : "N/A"}
    </div>
  </div>

  {#if getCurrentVersion()?.songs.length === 0}
    <div class="px-6 py-12 text-center text-gray-500">
      <p>No songs in this version yet.</p>
      <div class="mt-4">
        <Button onclick={() => (showAddSongModal = true)} variant="secondary"
          >Add your first song</Button
        >
      </div>
    </div>
  {:else}
    <ul class="divide-y divide-gray-200">
      {#each getCurrentVersion()?.songs || [] as songbookSong, index}
        <li
          class="px-6 py-4 flex items-center justify-between cursor-move"
          draggable="true"
          ondragstart={(e) => handleDragStart(e, index)}
          ondragover={(e) => handleDragOver(e, index)}
          ondragleave={handleDragLeave}
          ondrop={(e) => handleDrop(e, index)}
          ondragend={handleDragEnd}
          class:bg-indigo-50={draggedIndex === index}
          class:border-l-4={dragOverIndex === index}
          class:border-l-indigo-500={dragOverIndex === index}
        >
          <div class="flex items-center gap-4">
            <svg
              class="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8h16M4 16h16"
              />
            </svg>
            <span class="text-gray-400 text-sm w-6">{index + 1}.</span>
            <div>
              <a
                href="/songs/{songbookSong.songVersion.song.id}"
                class="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {songbookSong.songVersion.title}
              </a>
              {#if songbookSong.songVersion.author}
                <p class="text-sm text-gray-500">
                  {songbookSong.songVersion.author}
                </p>
              {/if}
            </div>
          </div>
          <form
            method="POST"
            action="?/removeSong"
            use:enhance={() => {
              return ({ result }) => {
                if (result.type === "success") {
                  goto(`/songbooks/${data.songbook.id}`);
                }
              };
            }}
          >
            <input
              type="hidden"
              name="songVersionId"
              value={songbookSong.songVersion.id}
            />
            <Button type="submit" variant="danger">Remove</Button>
          </form>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if data.songbook.versions.length > 1}
  <div class="mt-8">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <ul class="divide-y divide-gray-200">
        {#each data.songbook.versions.slice(1) as version}
          <li class="px-6 py-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium text-gray-900">{version.title}</p>
                {#if version.description}
                  <p class="text-sm text-gray-500">{version.description}</p>
                {/if}
                <p class="text-sm text-gray-400 mt-1">
                  {version.songs.length} songs &bull;
                  {new Date(version.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<form id="reorder-form" method="POST" action="?/reorderSongs">
  {#each getCurrentVersion()?.songs || [] as song}
    <input type="hidden" name="songVersionIds" value={song.songVersion.id} />
  {/each}
</form>

<Modal
  bind:open={showAddSongModal}
  title="Add Song to Songbook"
  class="max-w-3xl"
  onclose={() => {
    showAddSongModal = false;
    songSearchQuery = "";
  }}
>
  {#snippet children()}
    {#if data.availableSongs.length === 0}
      <p class="text-gray-700 mb-4">No songs available. Create a song first.</p>
      <div class="flex justify-end">
        <Button
          onclick={() => {
            showAddSongModal = false;
            goto("/songs");
          }}>Go to Songs</Button
        >
      </div>
    {:else}
      <form
        method="POST"
        action="?/addSong"
        use:enhance={() => {
          return async ({ result }) => {
            if (result.type === "success") {
              showAddSongModal = false;
              songSearchQuery = "";
              selectedSongVersionIds = [];
              await invalidateAll();
            }
          };
        }}
      >
        {#if form?.error}
          <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {form.error}
          </div>
        {/if}

        <div class="mb-4">
          <input
            type="text"
            placeholder="Search songs..."
            bind:value={songSearchQuery}
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              for="songbook-picker-tag"
              class="block text-sm font-medium text-gray-700 mb-1">Tag</label
            >
            <select
              id="songbook-picker-tag"
              bind:value={selectedTagId}
              onchange={applySongPickerFilters}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
            >
              <option value="">All tags</option>
              {#each data.tagOptions as opt (opt.id)}
                <option value={opt.id}>{opt.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <label
              for="songbook-picker-category"
              class="block text-sm font-medium text-gray-700 mb-1">Category</label
            >
            <select
              id="songbook-picker-category"
              bind:value={selectedCategoryId}
              onchange={applySongPickerFilters}
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
            >
              <option value="">All categories</option>
              {#each data.categoryOptions as opt (opt.id)}
                <option value={opt.id}>{opt.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="mb-4 max-h-64 overflow-y-auto border rounded-md">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected()}
                    onchange={(e) => toggleAll(e.currentTarget.checked)}
                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th
                  class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >Title</th
                >
                <th
                  class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                  >Author</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              {#each getFilteredSongs() as song}
                {@const displayedVersion = getDisplayedSongVersion(song)}
                {#if displayedVersion}
                  <tr class="hover:bg-gray-50">
                    <td class="px-3 py-2">
                      <input
                        type="checkbox"
                        name="songVersionIds"
                        value={displayedVersion.id}
                        checked={selectedSongVersionIds.includes(
                          displayedVersion.id,
                        )}
                        onchange={() => toggleSong(displayedVersion.id)}
                        class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-900">
                      <div>
                        {displayedVersion.title}
                        {#if song.recommendedVersionId === displayedVersion.id}
                          <span
                            class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                          >
                            Recommended
                          </span>
                        {/if}
                      </div>
                      {#if song.tags?.length || song.categories?.length}
                        <div
                          class="mt-1 flex flex-wrap gap-1"
                          aria-label="Tags and categories"
                        >
                          {#each song.tags as t (t.tag.id)}
                            <span
                              class="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-800"
                              >{t.tag.name}</span
                            >
                          {/each}
                          {#each song.categories as c (c.category.id)}
                            <span
                              class="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800"
                              >{c.category.name}</span
                            >
                          {/each}
                        </div>
                      {/if}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-500"
                      >{displayedVersion.author || "Unknown"}</td
                    >
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>

        {#if selectedSongVersionIds.length > 0}
          <p class="mb-4 text-sm text-gray-600">
            {selectedSongVersionIds.length} song{selectedSongVersionIds.length ===
            1
              ? ""
              : "s"} selected
          </p>
        {/if}

        <div class="flex justify-end gap-2">
          <Button
            variant="secondary"
            onclick={() => {
              showAddSongModal = false;
              songSearchQuery = "";
            }}>Cancel</Button
          >
          <Button type="submit" disabled={selectedSongVersionIds.length === 0}
            >Add {selectedSongVersionIds.length > 0
              ? selectedSongVersionIds.length
              : ""} Song{selectedSongVersionIds.length === 1 ? "" : "s"}</Button
          >
        </div>
      </form>
    {/if}
  {/snippet}
</Modal>

<Modal
  bind:open={showNewVersionModal}
  title="Create New Version"
  onclose={() => (showNewVersionModal = false)}
>
  {#snippet children()}
    <form
      method="POST"
      action="?/createVersion"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === "success") {
            showNewVersionModal = false;
            await invalidateAll();
          }
        };
      }}
    >
      {#if form?.error}
        <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {form.error}
        </div>
      {/if}

      <Input label="Title" id="title" required bind:value={versionTitle} />
      <Input
        label="Description"
        id="description"
        type="textarea"
        rows={3}
        bind:value={versionDescription}
      />

      <div class="flex justify-end gap-2 mt-6">
        <Button
          variant="secondary"
          onclick={() => (showNewVersionModal = false)}>Cancel</Button
        >
        <Button type="submit">Create Version</Button>
      </div>
    </form>
  {/snippet}
</Modal>

<Modal bind:open={showForkModal} title="Fork Songbook" onclose={() => (showForkModal = false)}>
  {#snippet children()}
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Create a copy of this songbook that you can edit independently.
      </p>
      <div>
        <label for="fork-title" class="block text-sm font-medium text-gray-700">
          New Songbook Title
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
          {isForking ? "Forking..." : "Fork Songbook"}
        </Button>
      </div>
    </div>
  {/snippet}
</Modal>

<Modal
  bind:open={showCollabModal}
  title="Sharing"
  onclose={() => (showCollabModal = false)}
>
  {#snippet children()}
    <div class="space-y-6">
      <p class="text-sm text-gray-600">
        {collaborationUiCopy.songbookSharingModalIntro}
      </p>
      <p class="text-xs text-gray-500">
        <a
          href="/people"
          class="text-indigo-600 hover:text-indigo-800 underline"
          >{collaborationUiCopy.findPeopleLinkText}</a
        >
      </p>

      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-2">Owner</h4>
        <p class="text-sm text-gray-900">
          {data.owner.displayName} ({data.owner.email})
        </p>
        <p class="mt-1 text-xs text-gray-500">{collaborationUiCopy.ownerBlurb}</p>
      </div>

      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-2">Collaborators</h4>
        <p class="text-xs text-gray-500 mb-2">
          {collaborationUiCopy.editorSongbookBlurb}
          {collaborationUiCopy.adminCollabBlurb}
        </p>
        {#if data.collaborators.length === 0}
          <p class="text-sm text-gray-500">No collaborators yet</p>
        {:else}
          <ul class="divide-y divide-gray-200 border rounded-md">
            {#each data.collaborators as collab}
              <li class="px-3 py-2 flex justify-between items-center gap-2">
                <span class="text-sm"
                  >{collab.displayName} ({collab.email})</span
                >
                <span class="text-xs text-gray-600 shrink-0"
                  >{collaboratorRoleLabel(collab.role)}</span
                >
                {#if data.isOwner}
                  <form
                    method="POST"
                    action="?/removeCollaborator"
                    use:enhance={() => refreshSharing()}
                  >
                    <input type="hidden" name="userId" value={collab.id} />
                    <Button
                      variant="danger"
                      type="submit"
                      onclick={() => (showCollabModal = false)}>Remove</Button
                    >
                  </form>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      {#if data.isOwner}
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Add collaborator</h4>
          <form
            method="POST"
            action="?/addCollaborator"
            use:enhance={() => refreshSharing(true)}
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start mb-2">
              <select
                name="userId"
                bind:value={selectedUserId}
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                aria-label="User to add as collaborator"
              >
                <option value="">Select a user...</option>
                {#each availableUsers as user}
                  <option value={user.id}
                    >{user.displayName} ({user.email})</option
                  >
                {/each}
              </select>
              <div class="flex flex-col gap-1 sm:w-48">
                <label
                  for="songbook-new-collab-role"
                  class="text-xs font-medium text-gray-600">Role</label
                >
                <select
                  id="songbook-new-collab-role"
                  name="role"
                  bind:value={selectedRole}
                  class="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  aria-describedby="songbook-collab-role-help"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <p id="songbook-collab-role-help" class="text-xs text-gray-500 mb-2">
              {#if selectedRole === "EDITOR"}
                {collaborationUiCopy.editorSongbookBlurb}
              {:else}
                {collaborationUiCopy.adminCollabBlurb}
              {/if}
            </p>
            <Button type="submit" disabled={!selectedUserId}>Add</Button>
          </form>
        </div>

        <div class="border-t pt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-2">
            Transfer ownership
          </h4>
          <p class="text-xs text-gray-500 mb-2">
            The previous owner becomes a collaborator with Editor access.
          </p>
          <form
            method="POST"
            action="?/transferOwnership"
            use:enhance={() => refreshSharing(true)}
          >
            <div class="flex gap-2">
              <select
                name="newOwnerId"
                bind:value={selectedUserId}
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                aria-label="New owner"
              >
                <option value="">Select new owner...</option>
                {#each data.collaborators as collab}
                  <option value={collab.id}
                    >{collab.displayName} ({collab.email})</option
                  >
                {/each}
              </select>
              <Button
                type="submit"
                variant="danger"
                disabled={!selectedUserId}>Transfer</Button
              >
            </div>
          </form>
        </div>
      {/if}
    </div>
  {/snippet}
</Modal>

<Modal bind:open={showSettingsModal} title="Songbook Settings" onclose={() => (showSettingsModal = false)}>
  {#snippet children()}
    <form
      method="POST"
      action="?/updateSettings"
      use:enhance={() => {
        return async ({ result }) => {
          if (result.type === "success") {
            showSettingsModal = false;
            await invalidateAll();
          }
        };
      }}
    >
      <div class="space-y-4">
        <div>
          <label for="output-mode" class="block text-sm font-medium text-gray-700">
            Output Mode
          </label>
          <select
            id="output-mode"
            name="mode"
            bind:value={outputMode}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="chorded">Chorded (with chords)</option>
            <option value="text-only">Text Only (no chords)</option>
            <option value="overhead">Overhead/Projection</option>
          </select>
        </div>

        <div>
          <label for="output-fontsize" class="block text-sm font-medium text-gray-700">
            Font Size
          </label>
          <select
            id="output-fontsize"
            name="fontSize"
            bind:value={outputFontSize}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="small">Small (14pt)</option>
            <option value="medium">Medium (16pt)</option>
            <option value="large">Large (20pt)</option>
            <option value="extra-large">Extra Large (24pt)</option>
          </select>
        </div>

        <div>
          <label for="output-papersize" class="block text-sm font-medium text-gray-700">
            Paper Size
          </label>
          <select
            id="output-papersize"
            name="paperSize"
            bind:value={outputPaperSize}
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onclick={() => (showSettingsModal = false)}>Cancel</Button>
          <Button type="submit">Save Settings</Button>
        </div>
      </div>
    </form>
  {/snippet}
</Modal>
