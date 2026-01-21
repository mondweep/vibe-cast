import { writable, get } from 'svelte/store';
import type { LocationService } from '$lib/domain/location/LocationService';
import type { GeocodingService } from '$lib/domain/location/GeocodingService';
import type { FactService } from '$lib/domain/discovery/FactService';
import type { VoiceService } from '$lib/domain/voice/VoiceService';
import type { AudioService } from '$lib/domain/audio/AudioService';

interface JourneyState {
    status: 'idle' | 'driving' | 'speaking';
    currentLocation: string | null;
    currentFact: string | null;
    lastFactCoordinates: { lat: number; lon: number } | null;
}

export type JourneyServices = {
    location: typeof LocationService;
    geocoding: typeof GeocodingService;
    fact: typeof FactService;
    voice: typeof VoiceService;
    audio: typeof AudioService;
}; // Using 'typeof Class' for static methods where applicable in V1

export function createJourneyStore(services: any) { // services typed loosely for V1 speed, ideally generic
    const { subscribe, update, set } = writable<JourneyState>({
        status: 'idle',
        currentLocation: null,
        currentFact: null,
        lastFactCoordinates: null
    });

    return {
        subscribe,
        startDrive: async () => {
            // 1. Audio Focus
            await services.audio.requestFocus();

            // 2. Connect Voice
            try {
                // Instantiate if assumed not static (VoiceService is instance based in previous code)
                // For this implementation, we assume 'services.voice' is the instance or we handled it in DI
                // Let's assume passed services are INSTANCES or Static Wrappers suitable for usage.
                if (services.voice.connect) await services.voice.connect();
            } catch (e) {
                console.error('Voice connect failed', e);
            }

            update(s => ({ ...s, status: 'driving' }));
        },

        checkLocation: async () => {
            // Workflow:
            // 1. Get GPS
            const coords = await services.location.getCurrentLocation();

            // 2. Reverse Geocode
            const entity = await services.geocoding.reverseGeocode(coords.latitude, coords.longitude);

            // 3. Update State
            update(s => ({ ...s, currentLocation: entity.name }));

            // 4. Generate Fact
            const fact = await services.fact.generateFact(entity.name);
            update(s => ({ ...s, currentFact: fact }));

            // 5. Speak
            if (services.voice.speak) {
                await services.voice.speak(fact);
            }
        },

        endDrive: async () => {
            await services.audio.abandonFocus();
            if (services.voice.disconnect) services.voice.disconnect();
            set({
                status: 'idle',
                currentLocation: null,
                currentFact: null,
                lastFactCoordinates: null
            });
        }
    };
}
