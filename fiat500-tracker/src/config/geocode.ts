interface GeocodeResult {
  latitude: number;
  longitude: number;
}

// Cache geocoded postcodes to avoid repeated API calls
const cache = new Map<string, GeocodeResult | null>();

export async function geocodePostcode(postcode: string): Promise<GeocodeResult | null> {
  const normalised = postcode.toUpperCase().replace(/\s+/g, '');

  if (cache.has(normalised)) {
    return cache.get(normalised) ?? null;
  }

  const encoded = encodeURIComponent(postcode.trim());
  const response = await fetch(`https://api.postcodes.io/postcodes/${encoded}`);

  if (!response.ok) {
    cache.set(normalised, null);
    return null;
  }

  const json = await response.json() as { result?: { latitude: number; longitude: number } };

  if (!json.result) {
    cache.set(normalised, null);
    return null;
  }

  const result: GeocodeResult = {
    latitude: json.result.latitude,
    longitude: json.result.longitude,
  };

  cache.set(normalised, result);
  return result;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
