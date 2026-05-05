export interface GeocodingResult {
  lat: number;
  lng: number;
  neighborhood: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const query = encodeURIComponent(`${address}, New York City, NY`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1&countrycodes=us`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'NYC-Apt-Hunter/1.0 (personal apartment search)',
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) throw new Error('Geocoding request failed');

  const data = await res.json();

  if (!data || data.length === 0) {
    throw new Error('Address not found. Try a more specific address.');
  }

  const result = data[0];
  const addr = result.address ?? {};

  const neighborhood =
    addr.neighbourhood ||
    addr.suburb ||
    addr.city_district ||
    addr.quarter ||
    addr.borough ||
    addr.county ||
    'New York City';

  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    neighborhood,
  };
}
