<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Admin Activity – Songbook</title>
</svelte:head>

<div class="space-y-8">
  <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Activity log</h1>
      <p class="mt-1 text-sm text-gray-600">
        Recent actions across the app (newest first). Filter by action or resource type.
      </p>
    </div>

    <form method="GET" class="grid w-full gap-3 md:grid-cols-2 md:max-w-xl">
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Action</span>
        <select
          name="action"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL" selected={data.filters.action === "ALL"}>All actions</option>
          {#each data.actionOptions as action}
            <option value={action} selected={data.filters.action === action}>{action}</option>
          {/each}
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Resource type</span>
        <select
          name="resourceType"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL" selected={data.filters.resourceType === "ALL"}>All types</option>
          {#each data.resourceTypeOptions as rt}
            <option value={rt} selected={data.filters.resourceType === rt}>{rt}</option>
          {/each}
        </select>
      </label>

      <div class="flex items-end gap-2 md:col-span-2">
        <button
          type="submit"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply
        </button>
        <a
          href="/admin/activity"
          class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear
        </a>
      </div>
    </form>
  </section>

  <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div class="border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">Recent entries</h2>
      <p class="mt-1 text-xs text-gray-500">
        Showing up to 200 rows
        {#if data.filters.action !== "ALL" || data.filters.resourceType !== "ALL"}
          · Filters:
          {#if data.filters.action !== "ALL"}
            action={data.filters.action}
          {/if}
          {#if data.filters.resourceType !== "ALL"}
            {data.filters.action !== "ALL" ? " · " : ""}resourceType={data.filters.resourceType}
          {/if}
        {/if}
      </p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Time
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Actor
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Action
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Resource
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Source
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Metadata
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each data.entries as row}
            <tr>
              <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td class="px-6 py-4 text-sm text-gray-700">
                <div class="font-medium text-gray-900">{row.actorDisplayName}</div>
                <div class="text-gray-500">{row.actorEmail}</div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700">{row.action}</td>
              <td class="px-6 py-4 text-sm text-gray-700">
                <span class="font-mono text-xs text-gray-600">{row.resourceType}</span>
                <div class="mt-0.5 max-w-xs truncate font-mono text-xs" title={row.resourceId}>
                  {row.resourceId}
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {#if row.sourceResourceType && row.sourceResourceId}
                  <span class="font-mono text-xs">{row.sourceResourceType}</span>
                  <div class="mt-0.5 max-w-xs truncate font-mono text-xs" title={row.sourceResourceId}>
                    {row.sourceResourceId}
                  </div>
                {:else}
                  <span class="text-gray-400">—</span>
                {/if}
              </td>
              <td class="max-w-xs truncate px-6 py-4 text-xs text-gray-600" title={row.metadataPreview}>
                {row.metadataPreview}
              </td>
            </tr>
          {/each}

          {#if data.entries.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
                No activity matches the current filters.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>
