import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Static adapter for PWA deployment
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),

		// Path aliases for cleaner imports
		alias: {
			'@lib': './src/lib',
			'@domain': './src/lib/domain',
			'@services': './src/lib/services',
			'@adapters': './src/lib/adapters',
			'@stores': './src/lib/stores',
			'@components': './src/components',
			'@types': './src/types'
		},

		// Service worker configuration
		serviceWorker: {
			register: true
		}
	}
};

export default config;
