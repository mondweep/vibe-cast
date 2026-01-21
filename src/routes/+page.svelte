<script lang="ts">
    import { createJourneyStore } from '$lib/stores/journey';
    import { LocationService } from '$lib/domain/location/LocationService';
    import { GeocodingService } from '$lib/domain/location/GeocodingService';
    import { FactService } from '$lib/domain/discovery/FactService';
    import { VoiceService } from '$lib/domain/voice/VoiceService';
    import { AudioService } from '$lib/domain/audio/AudioService';
    import { onDestroy, onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';

    const voiceService = new VoiceService();
    const audioService = new AudioService();

    const journey = createJourneyStore({
        location: LocationService,
        geocoding: GeocodingService,
        fact: FactService,
        voice: voiceService,
        audio: audioService
    });

    const POLL_INTERVAL_MS = 30000;
    let progress = 0;
    let pollTimer: any;
    let progressTimer: any;

    onDestroy(() => {
        journey.endDrive();
        clearTimers();
    });

    function clearTimers() {
        if (pollTimer) clearTimeout(pollTimer);
        if (progressTimer) clearInterval(progressTimer);
    }

    async function toggleDrive() {
        if ($journey.status === 'idle') {
            await journey.startDrive();
            // Initial Call
            pollLocation();
        } else {
            journey.endDrive();
            clearTimers();
            progress = 0;
        }
    }

    async function pollLocation() {
        if ($journey.status === 'idle') return;
        
        await journey.checkLocation();
        
        // Reset Progress
        progress = 0;
        const startTime = Date.now();
        
        // Visual Timer
        if (progressTimer) clearInterval(progressTimer);
        progressTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            progress = Math.min((elapsed / POLL_INTERVAL_MS) * 100, 100);
        }, 100);
        
        // Schedule next poll
        pollTimer = setTimeout(pollLocation, POLL_INTERVAL_MS); 
    }

    function downloadHistory() {
        const history = $journey.history;
        if (history.length === 0) return;

        // CSV Header
        let csv = 'Timestamp,Location,Fact\n';
        
        // Rows
        history.forEach(item => {
            const time = new Date(item.timestamp).toISOString();
            // Escape quotes in text
            const text = `"${item.text.replace(/"/g, '""')}"`;
            const loc = `"${item.location}"`;
            csv += `${time},${loc},${text}\n`;
        });

        // Trigger Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `driftwise_journey_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
</script>

<div class="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center font-sans">
    <div class="max-w-md w-full space-y-6">
        <!-- Header -->
        <div class="text-center pt-8">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Driftwise
            </h1>
            <p class="text-slate-400 mt-2 text-sm">Serendipity for your drive.</p>
        </div>

        <!-- Main Action & Status -->
        <div class="flex flex-col items-center gap-6">
            <button 
                on:click={toggleDrive}
                class="w-32 h-32 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-300 shadow-lg border-4 border-slate-800
                {$journey.status === 'idle' 
                    ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105 shadow-blue-500/30' 
                    : 'bg-red-500 hover:bg-red-400 animate-pulse shadow-red-500/30'}"
            >
                {$journey.status === 'idle' ? 'START' : 'STOP'}
            </button>

            {#if $journey.status !== 'idle'}
                <div class="text-center space-y-1">
                    <div class="flex items-center gap-2 justify-center text-xs text-slate-400 uppercase tracking-widest">
                        <span class="animate-pulse text-green-400">●</span> LIVE
                        {#if $journey.currentLocation}
                           <span>•</span> {$journey.currentLocation}
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

        <!-- Progress Bar (Next Fact) -->
        {#if $journey.status !== 'idle'}
            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div class="bg-blue-500 h-full transition-all duration-100 ease-linear" style="width: {progress}%"></div>
            </div>
            <p class="text-xs text-center text-slate-500">Next discovery in {Math.ceil((30000 - (30000 * progress / 100)) / 1000)}s</p>
        {/if}

        <!-- Feed -->
        <div class="flex-1 w-full space-y-4 pb-20">
            <div class="flex justify-between items-center">
                <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Discovery Log</h2>
                {#if $journey.history.length > 0}
                    <button 
                        on:click={downloadHistory}
                        class="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded-full border border-slate-700 transition-colors flex items-center gap-1"
                    >
                        <span>⬇</span> Export CSV
                    </button>
                {/if}
            </div>

            {#if $journey.history.length === 0 && $journey.status !== 'idle'}
                 <div class="text-center text-slate-600 italic py-10 animate-pulse">
                    Scanning coordinates...
                 </div>
            {/if}

            {#each $journey.history as fact (fact.id)}
                <div 
                    in:slide={{ duration: 300 }} 
                    out:fade 
                    class="bg-slate-800/80 backdrop-blur-sm rounded-xl p-5 border border-slate-700 shadow-xl"
                >
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-blue-300">{fact.location}</h3>
                        <span class="text-xs text-slate-500">
                            {new Date(fact.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <p class="text-slate-200 leading-relaxed font-light">
                        "{fact.text}"
                    </p>
                </div>
            {/each}
        </div>
    </div>
</div>
