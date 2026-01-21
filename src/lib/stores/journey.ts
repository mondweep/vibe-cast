import { writable, get } from 'svelte/store';
import type { LocationService } from '$lib/domain/location/LocationService';
import type { GeocodingService } from '$lib/domain/location/GeocodingService';
import type { FactService } from '$lib/domain/discovery/FactService';
import type { VoiceService } from '$lib/domain/voice/VoiceService';
import type { AudioService } from '$lib/domain/audio/AudioService';

export interface FactItem {
    id: string;
    location: string;
    text: string;
    timestamp: number;
}

interface JourneyState {
    status: 'idle' | 'driving' | 'speaking';
    currentLocation: string | null;
    currentFact: string | null;
    history: FactItem[]; // NEW: Scrollable history
    lastUpdateTimestamp: number; // NEW: For timer
}

// ... Services Type ...

export function createJourneyStore(services: any) {
    const { subscribe, update, set } = writable<JourneyState>({
        status: 'idle',
        currentLocation: null,
        currentFact: null,
        history: [],
        lastUpdateTimestamp: 0
    });

    return {
        subscribe,
        startDrive: async () => {
            await services.audio.requestFocus();
            try {
                if (services.voice.connect) await services.voice.connect();
            } catch (e) {
                console.error('Voice connect failed', e);
            }
            update(s => ({ ...s, status: 'driving', lastUpdateTimestamp: Date.now() }));
        },

        checkLocation: async () => {
            // 1. Get GPS
            const coords = await services.location.getCurrentLocation();

            // 2. Reverse Geocode
            const entity = await services.geocoding.reverseGeocode(coords.latitude, coords.longitude);

            const now = Date.now();
            update(s => ({ ...s, currentLocation: entity.name }));

            // 3. Generate Fact
            const factText = await services.fact.generateFact(entity.name);

            // 4. Update History
            const newFact: FactItem = {
                id: crypto.randomUUID(),
                location: entity.name,
                text: factText,
                timestamp: now
            };

            update(s => ({
                ...s,
                currentFact: factText,
                lastUpdateTimestamp: now,
                history: [newFact, ...s.history].slice(0, 50) // Keep last 50
            }));

            // 5. Speak
            if (services.voice.speak) {
                await services.voice.speak(factText);
            }
        },

        endDrive: async () => {
            await services.audio.abandonFocus();
            if (services.voice.disconnect) services.voice.disconnect();
            set({
                status: 'idle',
                currentLocation: null,
                currentFact: null,
                history: [],
                lastUpdateTimestamp: 0
            });
        }
    };
}
