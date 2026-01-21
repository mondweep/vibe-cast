import { Geolocation, type Position } from '@capacitor/geolocation';

export interface Coordinate {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
}

export class LocationService {
    static async getCurrentLocation(): Promise<Coordinate> {
        const position = await Geolocation.getCurrentPosition();
        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed
        };
    }
}
