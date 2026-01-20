export type SimStatus = 'active' | 'warning' | 'critical' | 'inactive';

export interface SimCard {
    id: string;
    iccid: string;
    status: SimStatus;
    lat: number;
    lng: number;
    dataUsage: number; // MB
    country: string;
    operator: string;
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
    { name: 'USA', lat: 37.0902, lng: -95.7129 },
    { name: 'UK', lat: 55.3781, lng: -3.4360 },
    { name: 'Germany', lat: 51.1657, lng: 10.4515 },
    { name: 'France', lat: 46.2276, lng: 2.2137 },
    { name: 'China', lat: 35.8617, lng: 104.1954 },
    { name: 'India', lat: 20.5937, lng: 78.9629 },
    { name: 'Brazil', lat: -14.2350, lng: -51.9253 },
    { name: 'Australia', lat: -25.2744, lng: 133.7751 },
    { name: 'South Africa', lat: -30.5595, lng: 22.9375 },
    { name: 'Japan', lat: 36.2048, lng: 138.2529 }
];

function randomLocation(lat: number, lng: number, spread: number) {
    return {
        lat: lat + (Math.random() - 0.5) * spread,
        lng: lng + (Math.random() - 0.5) * spread
    };
}

export function generateMockSims(count: number = 200): SimCard[] {
    return Array.from({ length: count }).map((_, i) => {
        const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        const loc = randomLocation(country.lat, country.lng, 15);
        const statusRand = Math.random();
        let status: SimStatus = 'active';

        if (statusRand > 0.95) status = 'critical';
        else if (statusRand > 0.9) status = 'warning';

        return {
            id: `sim-${Math.random().toString(36).substr(2, 9)}`,
            iccid: `89${Math.floor(Math.random() * 100000000000000000)}`,
            status,
            lat: loc.lat,
            lng: loc.lng,
            dataUsage: Math.floor(Math.random() * 10000),
            lastActive: new Date().toISOString(),
            country: country.name,
            operator: ['TCL MOVE', 'Vodafone Roaming', 'O2 Wrapper', 'AT&T IoT', 'Telefonica Global'][Math.floor(Math.random() * 5)]
        };
    });
}

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
