export type SimStatus = 'active' | 'warning' | 'error' | 'inactive';

export interface SimCard {
    id: string;
    iccid: string;
    status: SimStatus;
    lat: number;
    lng: number;
    dataUsage: number; // MB
    country: string;
}

export interface EsimProfile {
    id: string;
    name: string;
    provider: string;
    country: string;
    dataLimit: string;
    price: string;
}

export interface FleetStats {
    totalActive: number;
    totalData: string;
    alerts: number;
    healthScore: number;
}

const COUNTRIES = [
    { code: 'US', lat: 37.0902, lng: -95.7129, name: 'United States' },
    { code: 'GB', lat: 55.3781, lng: -3.4360, name: 'United Kingdom' },
    { code: 'DE', lat: 51.1657, lng: 10.4515, name: 'Germany' },
    { code: 'IN', lat: 20.5937, lng: 78.9629, name: 'India' },
    { code: 'JP', lat: 36.2048, lng: 138.2529, name: 'Japan' },
    { code: 'BR', lat: -14.2350, lng: -51.9253, name: 'Brazil' },
    { code: 'ZA', lat: -30.5595, lng: 22.9375, name: 'South Africa' },
    { code: 'AU', lat: -25.2744, lng: 133.7751, name: 'Australia' },
];

function randomLocation(baseLat: number, baseLng: number, spread: number) {
    return {
        lat: baseLat + (Math.random() - 0.5) * spread,
        lng: baseLng + (Math.random() - 0.5) * spread,
    };
}

export const generateMockSims = (count: number): SimCard[] => {
    return Array.from({ length: count }).map((_, i) => {
        const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        const loc = randomLocation(country.lat, country.lng, 15);
        const statusRand = Math.random();
        let status: SimStatus = 'active';
        if (statusRand > 0.95) status = 'error';
        else if (statusRand > 0.9) status = 'warning';

        return {
            id: `sim-${i}`,
            iccid: `89${Math.floor(Math.random() * 100000000000000000)}`,
            status,
            lat: loc.lat,
            lng: loc.lng,
            dataUsage: Math.floor(Math.random() * 5000),
            country: country.name,
        };
    });
};

export const MOCK_ESIM_PROFILES: EsimProfile[] = [
    { id: 'prof_1', name: 'Global Traveler', provider: 'Tata MOVE', country: 'Global', dataLimit: '5GB', price: '$15.00' },
    { id: 'prof_2', name: 'Euro Pass', provider: 'Tata MOVE', country: 'Europe', dataLimit: '10GB', price: '$20.00' },
    { id: 'prof_3', name: 'Asia Connect', provider: 'Tata MOVE', country: 'Asia Pacific', dataLimit: '3GB', price: '$12.00' },
    { id: 'prof_4', name: 'USA Unlimited', provider: 'Tata MOVE', country: 'USA', dataLimit: 'Unlimited', price: '$45.00' },
];

export const generateFleetStats = (): FleetStats => ({
    totalActive: 142893,
    totalData: '8.4 TB',
    alerts: 3,
    healthScore: 98,
});
