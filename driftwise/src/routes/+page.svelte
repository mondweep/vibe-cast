<script lang="ts">
	import { onMount } from 'svelte';

	// Application state
	let status: 'idle' | 'locating' | 'researching' | 'speaking' | 'listening' | 'error' = 'idle';
	let currentFact: string | null = null;
	let isActive = false;
	let permissionGranted = false;

	// Status messages
	const statusMessages: Record<typeof status, string> = {
		idle: 'Waiting for next discovery...',
		locating: 'Finding your location...',
		researching: 'Researching local history...',
		speaking: 'Sharing a discovery...',
		listening: 'Listening for commands...',
		error: 'Something went wrong'
	};

	onMount(() => {
		// Check for location permission on mount
		checkLocationPermission();
	});

	async function checkLocationPermission() {
		try {
			const result = await navigator.permissions.query({ name: 'geolocation' });
			permissionGranted = result.state === 'granted';
		} catch {
			// Permissions API not supported, will check on first request
			permissionGranted = false;
		}
	}

	async function toggleSession() {
		if (isActive) {
			stopSession();
		} else {
			await startSession();
		}
	}

	async function startSession() {
		if (!permissionGranted) {
			// Request location permission
			try {
				const position = await new Promise<GeolocationPosition>((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject, {
						enableHighAccuracy: true,
						timeout: 5000
					});
				});
				permissionGranted = true;
			} catch (error) {
				status = 'error';
				return;
			}
		}

		isActive = true;
		status = 'idle';

		// TODO: Start polling cycle
		// This will be implemented in Phase 2+
	}

	function stopSession() {
		isActive = false;
		status = 'idle';
		currentFact = null;

		// TODO: Stop polling cycle
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
		<div class="status-indicator" class:active={isActive} class:error={status === 'error'}>
			<span class="status-dot"></span>
			<span class="status-text">{statusMessages[status]}</span>
		</div>
	</section>

	{#if currentFact}
		<section class="fact-section">
			<div class="fact-card">
				<p class="fact-text">{currentFact}</p>
			</div>
		</section>
	{/if}

	<section class="controls-section">
		<button class="primary-button" class:active={isActive} on:click={toggleSession}>
			{isActive ? 'Stop Discovery' : 'Start Discovery'}
		</button>

		{#if !permissionGranted}
			<p class="permission-note">Location permission required for discovery</p>
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
