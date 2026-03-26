<script lang="ts">
	let {
		type = 'button',
		variant = 'primary',
		disabled = false,
		onclick,
		children
	}: {
		type?: 'button' | 'submit';
		variant?: 'primary' | 'secondary' | 'danger';
		disabled?: boolean;
		onclick?: () => void;
		children: import('svelte').Snippet;
	} = $props();

	const baseClasses = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses = {
		primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
		secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
	};
</script>

<button
	{type}
	{disabled}
	class="{baseClasses} {variantClasses[variant]}"
	{onclick}
>
	{@render children()}
</button>
