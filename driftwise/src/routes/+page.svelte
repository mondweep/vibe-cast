<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		appState,
		isRunning,
		currentStatus,
		currentFact,
		pollingInterval,
		stats
	} from '$lib/stores/appState';
	import { LocationService } from '$lib/services/LocationService';
	import { NominatimAdapter } from '$lib/adapters/NominatimAdapter';
	import { FactGenerationService } from '$lib/services/FactGenerationService';
	import { getCurrentSeasonalContext } from '$lib/domain/discovery';
	import { createLocation } from '$lib/domain/location';
	import type { HistoricalFact } from '$lib/domain/discovery';

	// Services
	let locationService: LocationService;
	let nominatimAdapter: NominatimAdapter;
	let factService: FactGenerationService | null = null;

	// Local state
	let permissionGranted = false;
	let pollingTimer: ReturnType<typeof setTimeout> | null = null;

	// Status messages
	const statusMessages: Record<string, string> = {
		idle: 'Waiting for next discovery...',
		locating: 'Finding your location...',
		geocoding: 'Identifying your area...',
		researching: 'Researching local history...',
		speaking: 'Sharing a discovery...',
		listening: 'Listening for commands...',
		paused: 'Paused',
		error: 'Something went wrong'
	};

	onMount(() => {
		// Initialize services
		locationService = new LocationService();
		nominatimAdapter = new NominatimAdapter();

		// Check for API key and create fact service
		const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
		if (apiKey) {
			factService = new FactGenerationService(apiKey);
		}

		// Check for location permission
		checkLocationPermission();
	});

	onDestroy(() => {
		stopSession();
	});

	async function checkLocationPermission() {
		try {
			const result = await navigator.permissions.query({ name: 'geolocation' });
			permissionGranted = result.state === 'granted';
		} catch {
			permissionGranted = false;
		}
	}

	async function toggleSession() {
		if ($isRunning) {
			stopSession();
		} else {
			await startSession();
		}
	}

	async function startSession() {
		if (!permissionGranted) {
			try {
				await new Promise<GeolocationPosition>((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						enableHighAccuracy: true,
						timeout: 5000
					});
				});
				permissionGranted = true;
			} catch {
				appState.setError('Location permission denied');
				return;
			}
		}

		if (!factService) {
			appState.setError('Gemini API key not configured');
			return;
		}

		appState.start();
		runDeliveryCycle();
	}

	function stopSession() {
		if (pollingTimer) {
			clearTimeout(pollingTimer);
			pollingTimer = null;
		}
		appState.stop();
	}

	async function runDeliveryCycle() {
		if (!$isRunning || !factService) return;

		try {
			// 1. Get location
			appState.setStatus('locating');
			const coords = await locationService.requestLocation();

			if (!coords) {
				scheduleNextCycle();
				return;
			}

			// 2. Geocode
			appState.setStatus('geocoding');
			const places = await nominatimAdapter.reverseGeocode(coords.latitude, coords.longitude);

			if (!places) {
				scheduleNextCycle();
				return;
			}

			// 3. Generate fact
			appState.setStatus('researching');
			const location = createLocation(coords, places);
			appState.setLocation(location);

			const context = getCurrentSeasonalContext();
			const fact = await factService.generateFact(places, context);

			if (!fact) {
				// No suitable fact found - skip cycle
				scheduleNextCycle();
				return;
			}

			// 4. Deliver fact
			appState.setStatus('speaking');
			appState.setFact(fact);

			// In full implementation, this would use voice delivery
			// For now, just display and schedule next cycle

			// 5. Schedule next cycle
			scheduleNextCycle();
		} catch (error) {
			console.error('Delivery cycle error:', error);
			scheduleNextCycle();
		}
	}

	function scheduleNextCycle() {
		if (!$isRunning) return;

		appState.setStatus('idle');

		pollingTimer = setTimeout(() => {
			runDeliveryCycle();
		}, $pollingInterval);
	}

	// Reactive values from stores
	$: statusText = statusMessages[$currentStatus] || 'Unknown status';
	$: factText = $currentFact?.text || null;
	$: sessionStats = $stats;
</script>

<svelte:head>
	<title>Driftwise - Local History Companion</title>
</svelte:head>

<main class="container">
	<header>
		<h1>Driftwise</h1>
		<p class="tagline">Serendipitous Local History</p>
	</header>

	<section class="status-section">
		<div class="status-indicator" class:active={$isRunning} class:error={$currentStatus === 'error'}>
			<span class="status-dot"></span>
			<span class="status-text">{statusText}</span>
		</div>

		{#if sessionStats.facts > 0}
			<p class="stats">{sessionStats.facts} fact{sessionStats.facts !== 1 ? 's' : ''} discovered</p>
		{/if}
	</section>

	{#if factText}
		<section class="fact-section">
			<div class="fact-card">
				<p class="fact-text">{factText}</p>
			</div>
		</section>
	{/if}

	<section class="controls-section">
		<button class="primary-button" class:active={$isRunning} on:click={toggleSession}>
			{$isRunning ? 'Stop Discovery' : 'Start Discovery'}
		</button>

		{#if !permissionGranted && !$isRunning}
			<p class="permission-note">Location permission required for discovery</p>
		{/if}

		{#if !factService && !$isRunning}
			<p class="permission-note">Configure VITE_GEMINI_API_KEY in .env to enable fact generation</p>
		{/if}
	</section>

	<footer>
		<p class="version">v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}</p>
	</footer>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			Oxygen,
			Ubuntu,
			sans-serif;
		background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
		min-height: 100vh;
		color: white;
	}

	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.tagline {
		font-size: 1rem;
		opacity: 0.8;
		margin-top: 0.5rem;
	}

	.status-section {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2rem;
		backdrop-filter: blur(10px);
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		transition: background 0.3s ease;
	}

	.status-indicator.active .status-dot {
		background: #4caf50;
		animation: pulse 2s infinite;
	}

	.status-indicator.error .status-dot {
		background: #f44336;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.status-text {
		font-size: 0.9rem;
	}

	.stats {
		font-size: 0.8rem;
		opacity: 0.7;
		margin-top: 0.5rem;
	}

	.fact-section {
		margin: 2rem 0;
	}

	.fact-card {
		background: rgba(255, 255, 255, 0.95);
		color: #333;
		padding: 1.5rem;
		border-radius: 1rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.fact-text {
		font-size: 1.1rem;
		line-height: 1.6;
		margin: 0;
	}

	.controls-section {
		text-align: center;
		padding: 2rem 0;
	}

	.primary-button {
		background: white;
		color: #1e88e5;
		border: none;
		padding: 1rem 2.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.primary-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
	}

	.primary-button.active {
		background: #f44336;
		color: white;
	}

	.permission-note {
		font-size: 0.85rem;
		opacity: 0.7;
		margin-top: 1rem;
	}

	footer {
		text-align: center;
		padding-top: 1rem;
	}

	.version {
		font-size: 0.75rem;
		opacity: 0.5;
	}
</style>
