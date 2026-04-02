<script lang="ts">
  let { data } = $props();

  function formatDateTime(value: string | Date | null) {
    if (!value) {
      return "Not sent";
    }

    return new Date(value).toLocaleString();
  }

  function getTransportLabel(transport: string): string {
    switch (transport) {
      case "mailgun":
        return "Mailgun";
      case "sendmail":
        return "Sendmail";
      case "log":
        return "Log (development)";
      default:
        return transport;
    }
  }
</script>

<svelte:head>
  <title>Admin Mail Deliveries – Songbook</title>
</svelte:head>

<div class="space-y-8">
  <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold text-gray-900">Mail transport</h2>
      <p class="text-sm text-gray-600">
        Current configuration: <span class="font-medium text-gray-900">{getTransportLabel(data.transportConfig.transport)}</span>
        {#if data.transportConfig.transport === "log"}
          <span class="ml-1 text-xs text-gray-500">(emails are logged to disk, not sent)</span>
        {/if}
      </p>
      <dl class="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt class="text-xs font-medium text-gray-500">From address</dt>
          <dd class="text-sm text-gray-900">{data.transportConfig.fromAddress}</dd>
        </div>
        {#if data.transportConfig.sendmailCommand}
          <div>
            <dt class="text-xs font-medium text-gray-500">Command</dt>
            <dd class="text-sm text-gray-900 font-mono">{data.transportConfig.sendmailCommand}</dd>
          </div>
        {/if}
        {#if data.transportConfig.mailgunDomain}
          <div>
            <dt class="text-xs font-medium text-gray-500">Mailgun domain</dt>
            <dd class="text-sm text-gray-900">{data.transportConfig.mailgunDomain}</dd>
          </div>
        {/if}
        {#if data.transportConfig.mailgunBaseUrl}
          <div>
            <dt class="text-xs font-medium text-gray-500">Mailgun API</dt>
            <dd class="text-sm text-gray-900 font-mono">{data.transportConfig.mailgunBaseUrl}</dd>
          </div>
        {/if}
      </dl>
    </div>
  </section>

  <section
    class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
  >
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Admin mail deliveries</h1>
      <p class="mt-1 text-sm text-gray-600">
        Review recent transactional email attempts, linked account flows, and
        delivery failures.
      </p>
    </div>

    <form method="GET" class="grid gap-3 md:grid-cols-3">
      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Search</span>
        <input
          type="search"
          name="search"
          value={data.filters.search}
          placeholder="Email, subject, error"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700">Status</span>
        <select
          name="status"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL" selected={data.filters.status === "ALL"}
            >All statuses</option
          >
          <option value="PENDING" selected={data.filters.status === "PENDING"}
            >Pending</option
          >
          <option value="SENT" selected={data.filters.status === "SENT"}
            >Sent</option
          >
          <option value="FAILED" selected={data.filters.status === "FAILED"}
            >Failed</option
          >
        </select>
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium text-gray-700"
          >Template</span
        >
        <select
          name="template"
          class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL" selected={data.filters.template === "ALL"}
            >All templates</option
          >
          <option value="invite" selected={data.filters.template === "invite"}
            >Invite</option
          >
          <option
            value="password_reset"
            selected={data.filters.template === "password_reset"}
            >Password reset</option
          >
        </select>
      </label>

      <div class="md:col-span-3 flex gap-3">
        <button
          type="submit"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply filters
        </button>
        <a
          href="/admin/email-deliveries"
          class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset
        </a>
      </div>
    </form>
  </section>

  <section class="grid gap-4 md:grid-cols-4">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Recent attempts</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {data.summary.total}
      </p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Sent</p>
      <p class="mt-2 text-2xl font-semibold text-green-700">
        {data.summary.sent}
      </p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Failed</p>
      <p class="mt-2 text-2xl font-semibold text-red-700">
        {data.summary.failed}
      </p>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p class="text-sm text-gray-500">Pending</p>
      <p class="mt-2 text-2xl font-semibold text-yellow-700">
        {data.summary.pending}
      </p>
    </div>
  </section>

  <section
    class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
  >
    <div class="border-b border-gray-200 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-900">Delivery attempts</h2>
      <p class="mt-1 text-sm text-gray-500">
        Showing up to the 200 most recent delivery records.
      </p>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Created</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Recipient</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Template</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Status</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Transport</th
            >
            <th
              class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >Details</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#each data.deliveries as delivery}
            <tr>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                <div>{formatDateTime(delivery.createdAt)}</div>
                <div class="text-xs text-gray-500">
                  Sent: {formatDateTime(delivery.sentAt)}
                </div>
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-700">
                <div class="font-medium text-gray-900">{delivery.toEmail}</div>
                <div class="text-gray-500">{delivery.fromEmail}</div>
                <div class="mt-1 break-all text-xs text-gray-500">
                  {delivery.relatedEntityLabel}
                </div>
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                <div class="font-medium text-gray-900">{delivery.template}</div>
                <div class="max-w-md text-gray-500">{delivery.subject}</div>
              </td>
              <td class="px-6 py-4 align-top text-sm">
                {#if delivery.status === "SENT"}
                  <span class="font-medium text-green-700">Sent</span>
                {:else if delivery.status === "FAILED"}
                  <span class="font-medium text-red-700">Failed</span>
                {:else}
                  <span class="font-medium text-yellow-700">Pending</span>
                {/if}
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                <div>{delivery.transport}</div>
                {#if delivery.providerMessageId}
                  <div class="mt-1 break-all text-xs text-gray-500">
                    Provider ID: {delivery.providerMessageId}
                  </div>
                {/if}
              </td>
              <td class="px-6 py-4 align-top text-sm text-gray-600">
                {#if delivery.errorMessage}
                  <div
                    class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700"
                  >
                    {delivery.errorMessage}
                  </div>
                {/if}

                {#if delivery.metadataSummary.length > 0}
                  <dl class="space-y-1">
                    {#each delivery.metadataSummary as item}
                      <div>
                        <dt class="font-medium text-gray-700">{item.label}</dt>
                        <dd class="break-all text-gray-500">{item.value}</dd>
                      </div>
                    {/each}
                  </dl>
                {:else if !delivery.errorMessage}
                  <span class="text-gray-400">No extra metadata</span>
                {/if}
              </td>
            </tr>
          {/each}

          {#if data.deliveries.length === 0}
            <tr>
              <td
                colspan="6"
                class="px-6 py-8 text-center text-sm text-gray-500"
              >
                No delivery attempts match the current filters.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>
