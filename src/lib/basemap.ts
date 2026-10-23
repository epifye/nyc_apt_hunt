// Basemap config for the map. CARTO now gates basemap assets behind an account
// key, so we render CARTO's GL *vector* style (via MapLibre GL, hosted inside
// Leaflet by @maplibre/maplibre-gl-leaflet) and inject the key into every
// tile/glyph/sprite request — see cartoTransformRequest. Key lives in
// VITE_CARTO_API_KEY (browser-exposed by nature; restrict by domain in the
// CARTO dashboard, do not treat as a secret).

const KEY = import.meta.env.VITE_CARTO_API_KEY as string | undefined;

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// CARTO GL vector style JSONs. Each pulls its tiles/glyphs/sprites from several
// *.cartocdn.com hosts, so the key is injected globally in transformRequest
// rather than baked into this URL.
export type CartoVectorStyle = 'positron' | 'voyager' | 'dark-matter' | 'positron-nolabels';
export const cartoVectorStyle = (style: CartoVectorStyle = 'positron'): string =>
  `https://basemaps.cartocdn.com/gl/${style}-gl-style/style.json`;

// Matches the previous raster look (light_all == Positron).
export const DEFAULT_MAP_STYLE = cartoVectorStyle('positron');

// MapLibre calls this for every network request the map makes. Append the CARTO
// key to any *.cartocdn.com request (tiles, glyphs, sprites, the style JSON
// itself). Returns undefined to leave non-CARTO requests untouched.
export function cartoTransformRequest(url: string): { url: string } | undefined {
  if (!KEY) return undefined; // unset locally → requests go out unchanged
  if (url.includes('cartocdn.com') && !/[?&]key=/.test(url)) {
    return { url: `${url}${url.includes('?') ? '&' : '?'}key=${KEY}` };
  }
  return undefined;
}
