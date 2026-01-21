import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
			manifest: {
				name: 'Driftwise',
				short_name: 'Driftwise',
				description: 'Voice-first serendipitous local history companion',
				theme_color: '#1e88e5',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				categories: ['travel', 'education', 'navigation'],
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icons/maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'nominatim-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 86400 // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			}
		})
	],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['tests/setup.ts']
	},
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version)
	}
});
