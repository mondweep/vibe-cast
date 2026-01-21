<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		appState,
		isRunning,
		currentStatus,
		currentFact,
		factHistory,
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
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let secondsUntilNext = 0;

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
		console.log('[Driftwise] Starting session...');

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
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		secondsUntilNext = 0;
		appState.stop();
	}

	const MAX_RETRIES = 3;
	const RETRY_DELAY_MS = 20000; // 20 seconds between retries

	async function runDeliveryCycle(retryCount = 0) {
		console.log('[Driftwise] Running delivery cycle...');
		if (!$isRunning || !factService) {
			console.log('[Driftwise] Not running or no factService');
			return;
		}

		try {
			// 1. Get location
			appState.setStatus('locating');
			const coords = await locationService.requestLocation();

			if (!coords) {
				console.log('[Driftwise] Could not get location, scheduling next cycle');
				scheduleNextCycle();
				return;
			}

			console.log(`[Driftwise] Location: ${coords.latitude}, ${coords.longitude}`);

			// 2. Geocode
			appState.setStatus('geocoding');
			const places = await nominatimAdapter.reverseGeocode(coords.latitude, coords.longitude);

			if (!places) {
				console.log('[Driftwise] Could not geocode location, scheduling next cycle');
				scheduleNextCycle();
				return;
			}

			console.log(`[Driftwise] Place: ${places.displayName}`);

			// 3. Generate fact
			appState.setStatus('researching');
			const location = createLocation(coords, places);
			appState.setLocation(location);

			const context = getCurrentSeasonalContext();
			console.log(`[Driftwise] Generating fact for ${places.displayName}... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

			const fact = await factService.generateFact(places, context);

			if (!fact) {
				console.log('[Driftwise] No suitable fact returned (incomplete or filtered)');

				// Retry immediately if we haven't exhausted retries
				if (retryCount < MAX_RETRIES) {
					console.log(`[Driftwise] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
					appState.setStatus('idle');
					pollingTimer = setTimeout(() => {
						runDeliveryCycle(retryCount + 1);
					}, RETRY_DELAY_MS);
					return;
				}

				console.log('[Driftwise] Max retries reached, scheduling next full cycle');
				scheduleNextCycle();
				return;
			}

			// 4. Deliver fact
			console.log(`[Driftwise] Fact delivered: "${fact.text.substring(0, 50)}..."`);
			appState.setStatus('speaking');
			appState.setFact(fact);

			// 5. Schedule next cycle after successful delivery
			scheduleNextCycle();
		} catch (error) {
			console.error('[Driftwise] Delivery cycle error:', error);
			scheduleNextCycle();
		}
	}

	function scheduleNextCycle() {
		if (!$isRunning) {
			console.log('[Driftwise] Not scheduling - session stopped');
			return;
		}

		appState.setStatus('idle');

		// Start countdown
		secondsUntilNext = Math.round($pollingInterval / 1000);
		console.log(`[Driftwise] Next discovery in ${secondsUntilNext} seconds...`);

		// Clear any existing countdown
		if (countdownTimer) {
			clearInterval(countdownTimer);
		}

		// Update countdown every second
		countdownTimer = setInterval(() => {
			secondsUntilNext = Math.max(0, secondsUntilNext - 1);
		}, 1000);

		pollingTimer = setTimeout(() => {
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
			console.log('[Driftwise] Timer fired - starting new cycle');
			runDeliveryCycle();
		}, $pollingInterval);
	}

	// Reactive values from stores
	$: statusText = statusMessages[$currentStatus] || 'Unknown status';
	$: factText = $currentFact?.text || null;
	$: sessionStats = $stats;
	$: allFacts = $factHistory;

	// Export facts as text file
	function exportFacts() {
		if (allFacts.length === 0) return;

		const header = `Driftwise - Local History Discoveries\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

		const factsText = allFacts
			.map((fact, index) => {
				const location = fact.metadata.sourceLocation.displayName || 'Unknown location';
				const date = new Date(fact.metadata.generatedAt).toLocaleString();
				return `[${index + 1}] ${location}\n${date}\n\n${fact.text}\n\n${'─'.repeat(40)}\n`;
			})
			.join('\n');

		const content = header + factsText;
		const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `driftwise-facts-${new Date().toISOString().slice(0, 10)}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
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

		{#if $isRunning && $currentStatus === 'idle' && secondsUntilNext > 0}
			<p class="countdown">Next discovery in {secondsUntilNext}s</p>
		{/if}
	</section>

	{#if allFacts.length > 0}
		<section class="fact-section">
			<div class="fact-header">
				<span class="fact-count">{allFacts.length} fact{allFacts.length !== 1 ? 's' : ''}</span>
				<button class="export-button" on:click={exportFacts} title="Download all facts">
					Export
				</button>
			</div>
			<div class="facts-list">
				{#each allFacts.slice().reverse() as fact, index (fact.id)}
					<div class="fact-card" class:latest={index === 0}>
						<p class="fact-text">{fact.text}</p>
						<p class="fact-meta">
							{fact.metadata.sourceLocation.displayName || 'Unknown location'}
						</p>
					</div>
				{/each}
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
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem 0;
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

	.countdown {
		font-size: 0.75rem;
		opacity: 0.6;
		margin-top: 0.25rem;
		font-family: monospace;
	}

	.fact-section {
		margin: 1rem 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.fact-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding: 0 0.25rem;
	}

	.fact-count {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	.export-button {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.export-button:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.facts-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 50vh;
		padding-right: 0.25rem;
	}

	.fact-card {
		background: rgba(255, 255, 255, 0.9);
		color: #333;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	.fact-card.latest {
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		border-left: 4px solid #4caf50;
	}

	.fact-text {
		font-size: 1rem;
		line-height: 1.5;
		margin: 0 0 0.5rem 0;
	}

	.fact-meta {
		font-size: 0.75rem;
		color: #666;
		margin: 0;
		opacity: 0.8;
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
