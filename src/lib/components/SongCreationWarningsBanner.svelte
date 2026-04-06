<script lang="ts">
  import type { SongCreationWarning } from "$lib/songCreationWarnings";

  type Props = {
    warnings: SongCreationWarning[];
    onDismiss: () => void;
  };

  let { warnings, onDismiss }: Props = $props();
</script>

{#if warnings.length > 0}
  <div
    class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950"
    role="status"
  >
    <div class="flex justify-between items-start gap-2">
      <h2 class="text-sm font-semibold">Heads up</h2>
      <button
        type="button"
        class="text-sm text-amber-900 underline shrink-0"
        onclick={onDismiss}
      >
        Dismiss
      </button>
    </div>
    {#each warnings as w, i (i)}
      <div class="mt-3 text-sm">
        {#if w.code === "possible_duplicate_titles"}
          <p>{w.message}</p>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            {#each w.matches as m (m.songId)}
              <li>
                <a href="/songs/{m.songId}" class="text-indigo-700 hover:text-indigo-900 underline"
                  >{m.versionTitle}</a
                >
                <span class="text-amber-900/80">
                  — {m.matchKind === "normalized"
                    ? "same title after normalization"
                    : "very similar title"}</span
                >
              </li>
            {/each}
          </ul>
        {:else}
          <p>{w.message}</p>
        {/if}
      </div>
    {/each}
  </div>
{/if}
