<script lang="ts">
    import { createJourneyStore } from '$lib/stores/journey';
    import { LocationService } from '$lib/domain/location/LocationService';
    import { GeocodingService } from '$lib/domain/location/GeocodingService';
    import { FactService } from '$lib/domain/discovery/FactService';
    import { VoiceService } from '$lib/domain/voice/VoiceService';
    import { AudioService } from '$lib/domain/audio/AudioService';
    import { onDestroy } from 'svelte';

    // Instantiate Services
    // Note: We create singletons here for the page scope
    const voiceService = new VoiceService();
    const audioService = new AudioService();

    const journey = createJourneyStore({
        location: LocationService, // Static
        geocoding: GeocodingService, // Static
        fact: FactService, // Static
        voice: voiceService, // Instance
        audio: audioService // Instance
    });

    // Cleanup on destroy
    onDestroy(() => {
        journey.endDrive();
    });

    async function toggleDrive() {
        if ($journey.status === 'idle') {
            await journey.startDrive();
            // Start polling loop (V1 simple implementation)
            pollLocation();
        } else {
            journey.endDrive();
        }
    }

    async function pollLocation() {
        if ($journey.status === 'idle') return;
        
        await journey.checkLocation();
        
        // Poll every 30s for demo (Real app would use watchPosition)
        setTimeout(pollLocation, 30000); 
    }
</script>

<div class="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center font-sans">
    <div class="max-w-md w-full space-y-8">
        <!-- Header -->
        <div class="text-center">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Driftwise
            </h1>
            <p class="text-slate-400 mt-2">Serendipity for your drive.</p>
        </div>

        <!-- Main Action -->
        <div class="flex justify-center my-12">
            <button 
                on:click={toggleDrive}
                class="w-48 h-48 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 shadow-lg
                {$journey.status === 'idle' 
                    ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105 shadow-blue-500/30' 
                    : 'bg-red-500 hover:bg-red-400 animate-pulse shadow-red-500/30'}"
            >
                {$journey.status === 'idle' ? 'START DRIVE' : 'STOP'}
            </button>
        </div>

        <!-- Status Card -->
        <div class="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 min-h-[200px]">
            {#if $journey.status === 'idle'}
                <div class="text-center text-slate-500">
                    <p>Ready to explore.</p>
                </div>
            {:else}
                <div class="space-y-4">
                    <div class="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest">
                        <span>Current Location</span>
                        <span class="text-green-400">● LIVE</span>
                    </div>
                    
                    <h2 class="text-2xl font-light">
                        {$journey.currentLocation || 'Locating...'}
                    </h2>
                    
                    {#if $journey.currentFact}
                        <div class="mt-4 pt-4 border-t border-slate-700 animate-fade-in">
                            <p class="text-slate-300 italic">"{$journey.currentFact}"</p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
