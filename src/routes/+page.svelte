<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/songs');
	});
</script>

<p>Redirecting to songs...</p>
