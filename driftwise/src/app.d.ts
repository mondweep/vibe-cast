// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Environment variables (from .env)
	interface ImportMetaEnv {
		readonly VITE_GEMINI_API_KEY: string;
		readonly VITE_NOMINATIM_USER_AGENT: string;
		readonly VITE_DEFAULT_POLLING_INTERVAL_MS: string;
		readonly VITE_MIN_POLLING_INTERVAL_MS: string;
		readonly VITE_MAX_POLLING_INTERVAL_MS: string;
		readonly VITE_DEBUG: string;
		readonly VITE_MOCK_LOCATION?: string;
		readonly VITE_MOCK_GEMINI?: string;
		readonly VITE_APP_VERSION: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
