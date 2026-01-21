<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// Register service worker for PWA
	onMount(async () => {
		if (browser && 'serviceWorker' in navigator) {
			try {
				// PWA registration is handled by vite-plugin-pwa
				// This is just for any additional setup
			} catch (error) {
				console.error('Service worker registration failed:', error);
			}
		}
	});
</script>

<slot />
