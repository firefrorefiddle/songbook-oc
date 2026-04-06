<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { navigateRelative } from "$lib/presentation/slideNavigation";

  let { data } = $props();

  const slideIndex = $derived(data.initialSlideIndex);
  const slideCount = $derived(data.slides.length);
  const current = $derived(
    slideCount > 0 ? (data.slides[slideIndex] ?? data.slides[0]) : null,
  );

  function syncSlideUrl(index: number) {
    const u = new URL($page.url);
    u.searchParams.set("slide", String(index));
    if (data.activeVersion?.id) {
      u.searchParams.set("version", data.activeVersion.id);
    }
    goto(`${u.pathname}${u.search}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  function go(delta: number) {
    const next = navigateRelative(slideIndex, delta, slideCount);
    if (next !== slideIndex) {
      syncSlideUrl(next);
    }
  }

  function goToVersion(versionId: string) {
    const u = new URL($page.url);
    u.searchParams.set("version", versionId);
    u.searchParams.delete("slide");
    goto(`${u.pathname}${u.search}`);
  }

  function onKeydown(e: KeyboardEvent) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) {
      return;
    }
    if (t.closest("button, a, input, textarea, select, option")) {
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (slideCount > 0) {
        syncSlideUrl(0);
      }
    } else if (e.key === "End") {
      e.preventDefault();
      if (slideCount > 0) {
        syncSlideUrl(slideCount - 1);
      }
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col"
  role="application"
  aria-label="Presentation mode"
>
  <header
    class="shrink-0 border-b border-neutral-800 px-4 py-3 flex flex-wrap items-center gap-3 text-sm text-neutral-400"
  >
    <a
      href="/songbooks/{data.songbookId}"
      class="text-amber-400/90 hover:text-amber-300 font-medium"
    >
      ← Songbook
    </a>
    {#if data.versionsSummary.length > 1}
      <label class="flex items-center gap-2">
        <span class="sr-only">Version</span>
        <select
          class="bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-neutral-200 max-w-[14rem]"
          onchange={(e) => goToVersion((e.currentTarget as HTMLSelectElement).value)}
        >
          {#each data.versionsSummary as v}
            <option value={v.id} selected={v.id === data.activeVersion?.id}>
              {v.title} ({v._count.songs})
            </option>
          {/each}
        </select>
      </label>
    {:else if data.activeVersion}
      <span class="text-neutral-500 truncate max-w-[16rem]">{data.activeVersion.title}</span>
    {/if}
    {#if slideCount > 0}
      <span class="ml-auto tabular-nums" aria-live="polite">
        {slideIndex + 1} / {slideCount}
      </span>
    {/if}
    {#if current}
      <a
        href="/songs/{current.songId}"
        class="text-amber-400/90 hover:text-amber-300 hidden sm:inline"
      >
        Open song
      </a>
    {/if}
  </header>

  <main class="flex-1 flex flex-col px-6 py-10 md:px-16 md:py-14 overflow-auto">
    {#if !data.activeVersion}
      <p class="text-xl text-neutral-400">This songbook has no versions yet.</p>
    {:else if slideCount === 0}
      <p class="text-xl text-neutral-400">No songs in this version.</p>
    {:else if current}
      <div class="max-w-4xl mx-auto w-full">
        <h1 class="text-3xl md:text-5xl font-semibold text-neutral-50 font-serif tracking-tight">
          {current.title}
        </h1>
        {#if current.author}
          <p class="mt-3 text-xl md:text-2xl text-neutral-400 font-serif">
            {current.author}
          </p>
        {/if}
        <pre
          class="mt-10 whitespace-pre-wrap font-serif text-2xl md:text-3xl leading-[1.65] text-neutral-100"
        >{current.content}</pre>
      </div>
    {/if}
  </main>

  {#if slideCount > 0}
    <footer
      class="shrink-0 border-t border-neutral-800 px-4 py-3 flex justify-center gap-4 text-neutral-500 text-sm"
    >
      <button
        type="button"
        class="px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        onclick={() => go(-1)}
      >
        Previous
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        onclick={() => go(1)}
      >
        Next
      </button>
      <span class="self-center hidden sm:inline">Arrow keys · Home · End</span>
    </footer>
  {/if}
</div>
