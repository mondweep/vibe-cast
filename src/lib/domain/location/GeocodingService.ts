export interface LocalityEntity {
    name: string;
    type: 'village' | 'town' | 'city' | 'landmark' | 'road' | 'unknown';
    context: Record<string, string>;
}

export class GeocodingService {
    private static readonly BASE_URL = 'https://nominatim.openstreetmap.org/reverse';
    private static readonly USER_AGENT = 'Driftwise (Alpha) - contact@dxsure.uk'; // TODO: Move to Env

    static async reverseGeocode(lat: number, lon: number): Promise<LocalityEntity> {
        const url = `${this.BASE_URL}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.USER_AGENT
                }
            });

            if (!response.ok) {
                throw new Error(`Nominatim API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return this.mapResponseToEntity(data);
        } catch (error) {
            console.error('Geocoding failed', error);
            // Return safe fallback
            return { name: 'Unknown Location', type: 'unknown', context: {} };
        }
    }

    private static mapResponseToEntity(data: any): LocalityEntity {
        const addr = data.address || {};

        // Priority Cascade for Name
        const name = addr.village || addr.town || addr.city || addr.suburb || addr.hamlet || addr.road || 'Unknown Place';

        // Type deduction
        let type: LocalityEntity['type'] = 'unknown';
        if (addr.village) type = 'village';
        else if (addr.town) type = 'town';
        else if (addr.city) type = 'city';
        else if (addr.road) type = 'road';

        return {
            name,
            type,
            context: addr
        };
    }
}
