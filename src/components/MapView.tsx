import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  GeoJSON,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { DEFAULT_MAP_STYLE, cartoTransformRequest, CARTO_ATTRIBUTION } from "../lib/basemap";
import {
  X,
  ExternalLink,
  Pencil,
  Trash2,
  WashingMachine,
  CalendarClock,
  Loader2,
  Layers,
  Archive,
} from "lucide-react";
import ReviewSection from "./ReviewSection";
import ApartmentRatings from "./ApartmentRatings";
import { Apartment, TourStatus } from "../types";
import { shortAddress } from "../utils/address";
import ImageLightbox from "./ImageLightbox";
import { WHOLE_FOODS_LOCATIONS } from "../data/wholeFoods";

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

// ── MTA subway line colors ────────────────────────────────────────────────────

const MTA_COLORS: Record<string, string> = {
  "1": "#EE352E",
  "2": "#EE352E",
  "3": "#EE352E",
  "4": "#00933C",
  "5": "#00933C",
  "6": "#00933C",
  "7": "#B933AD",
  A: "#0039A6",
  C: "#0039A6",
  E: "#0039A6",
  B: "#FF6319",
  D: "#FF6319",
  F: "#FF6319",
  M: "#FF6319",
  G: "#6CBE45",
  J: "#996633",
  Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A",
  Q: "#FCCC0A",
  R: "#FCCC0A",
  W: "#FCCC0A",
  S: "#808183",
};

function getLineColor(name: string): string {
  const first = (name || "").replace(/\s/g, "").toUpperCase()[0];
  return MTA_COLORS[first] ?? "#808183";
}

// ── Apartment markers ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TourStatus, string> = {
  not_contacted: "#C53030",
  pending_availability: "#EA580C",
  upcoming: "#1D57D8",
  toured: "#16803A",
};

function createApartmentIcon(status: TourStatus, colorOverride?: string, showBadge = true, selected = false): L.DivIcon {
  const color = colorOverride ?? STATUS_COLORS[status];
  const badge =
    showBadge && status === "pending_availability"
      ? `<circle cx="23" cy="5" r="6" fill="#fff" stroke="#fff" stroke-width="1"/>
       <circle cx="23" cy="5" r="5" fill="#EA580C"/>
       <text x="23" y="8.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="sans-serif">!</text>`
      : "";
  const w = selected ? 42 : 32;
  const h = selected ? 52 : 40;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" class="apt-marker-pin">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28S28 24.5 28 14C28 6.268 21.732 0 14 0z"
      fill="${color}" stroke="white" stroke-width="${selected ? 2 : 2.5}"/>
    <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.95"/>
    ${badge}
  </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h - 4],
  });
}

// ── Whole Foods icon ──────────────────────────────────────────────────────────

const wholeFoodsIcon = L.icon({
  iconUrl: `${import.meta.env.BASE_URL}whole-foods.png`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  tooltipAnchor: [13, 0],
});

// ── Subway data types ─────────────────────────────────────────────────────────

interface SubwayStation {
  name: string;
  routes: string[];
  lat: number;
  lng: number;
}

interface SubwayData {
  lines: object | null;
  stations: SubwayStation[];
  cachedAt: number;
}

async function fetchSubwayData(): Promise<SubwayData> {
  const [stationsRes, linesRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}subway_stations.geojson`),
    fetch(`${import.meta.env.BASE_URL}subway_lines.geojson`),
  ]);

  if (!stationsRes.ok)
    throw new Error(`Failed to load subway stations: ${stationsRes.status}`);
  if (!linesRes.ok)
    throw new Error(`Failed to load subway lines: ${linesRes.status}`);

  const [stationsGeojson, linesGeojson] = await Promise.all([
    stationsRes.json(),
    linesRes.json(),
  ]);

  const stations: SubwayStation[] = (stationsGeojson.features ?? [])
    .filter(
      (f: any) =>
        f?.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates),
    )
    .map((f: any) => ({
      name: f.properties?.stop_name ?? "",
      routes: (f.properties?.daytime_routes ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean),
      lat: Number(f.geometry.coordinates[1]),
      lng: Number(f.geometry.coordinates[0]),
    }))
    .filter((s: SubwayStation) => !isNaN(s.lat) && !isNaN(s.lng));

  return { lines: linesGeojson, stations, cachedAt: Date.now() };
}

// ── FlyTo helper ──────────────────────────────────────────────────────────────

function flyToApt(
  m: L.Map,
  lat: number,
  lng: number,
  zoom: number,
  isMobile: boolean,
  panelOpen: boolean,
  panelExpanded: boolean,
  duration = 0.9,
) {
  const pt = m.project([lat, lng] as L.LatLngExpression, zoom);
  let center: L.LatLng;
  if (isMobile) {
    center = m.unproject(pt.add([0, m.getSize().y / 3]), zoom);
  } else if (panelOpen && !panelExpanded) {
    center = m.unproject(pt.subtract([225, 0]), zoom);
  } else {
    center = m.unproject(pt, zoom);
  }
  m.flyTo(center, zoom, { duration });
}

// ── CARTO vector basemap ──────────────────────────────────────────────────────

function CartoBasemap() {
  const map = useMap();
  useEffect(() => {
    const layer = L.maplibreGL({
      style: DEFAULT_MAP_STYLE,
      transformRequest: cartoTransformRequest,
      attribution: CARTO_ATTRIBUTION,
    } as L.LeafletMaplibreGLOptions).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);
  return null;
}

// ── Capture map ref ───────────────────────────────────────────────────────────

function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}


// ── Helper formatters ─────────────────────────────────────────────────────────

function MapListingCarousel({ urls, imgHeight = 140 }: { urls: string[], imgHeight?: number }) {
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  if (hidden || !urls.length) return null;
  return (
    <>
      <div style={{ margin: '4px -16px', height: imgHeight, overflow: 'hidden', background: 'var(--surface-2)', position: 'relative', cursor: 'zoom-in' }}>
        <img
          key={urls[idx]}
          src={urls[idx]}
          alt="Listing"
          onClick={() => setLightbox(true)}
          onError={() => setHidden(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {urls.length > 1 && (
          <>
            {idx > 0 && (
              <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: 1 }}
              >‹</button>
            )}
            {idx < urls.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: 1 }}
              >›</button>
            )}
            <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {urls.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                  style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3,
                    background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'width 0.2s' }} />
              ))}
            </div>
          </>
        )}
      </div>
      {lightbox && <ImageLightbox urls={urls} initialIdx={idx} onClose={() => setLightbox(false)} />}
    </>
  );
}

function typeLabel(t: string) {
  return (
    { studio: "Studio", "1br": "1 BR", "2br": "2 BR", "3br+": "3+ BR" }[t] ?? t
  );
}

function formatDate(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, , mo, d, h, min] = m;
  const hour = parseInt(h),
    ampm = hour >= 12 ? "PM" : "AM";
  return `${parseInt(mo)}/${parseInt(d)}, ${hour % 12 || 12}:${min} ${ampm}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Apartment>) => void;
  onArchive: (id: string) => void;
  showList: boolean;
  listExpanded: boolean;
  isOwner: boolean;
  focusApartmentId?: string | null;
  onFocusHandled?: () => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MapView({ apartments, onEdit, onDelete, onUpdate, onArchive, showList, listExpanded, isOwner, focusApartmentId, onFocusHandled, showArchived, onToggleShowArchived }: Props) {
  const isMobile = useIsMobile();
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [subwayLoading, setSubwayLoading] = useState(true);
  const [showSubway, setShowSubway] = useState(true);
  const [showWholeFoods, setShowWholeFoods] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const savedSelectedId = useRef<string | null>(null);

  useEffect(() => {
    if (showList) {
      savedSelectedId.current = selectedId;
      setSelectedId(null);
      setReviewEditing(false);
    } else if (savedSelectedId.current) {
      setSelectedId(savedSelectedId.current);
      savedSelectedId.current = null;
    }
  }, [showList]);

  const selectedApt = apartments.find((a) => a.id === selectedId) ?? null;
  const [reviewEditing, setReviewEditing]   = useState(false);
  const [ratingEditing, setRatingEditing]   = useState(false);

  useEffect(() => { setReviewEditing(false); setRatingEditing(false); }, [selectedId]);

  useEffect(() => {
    if (!focusApartmentId) return;
    const apt = apartments.find(a => a.id === focusApartmentId);
    if (!apt) return;
    setSelectedId(focusApartmentId);
    const m = mapRef.current;
    if (m) {
      const zoom = Math.max(m.getZoom(), 15);
      flyToApt(m, apt.lat, apt.lng, zoom, isMobile, showList, listExpanded, 1.0);
    }
    onFocusHandled?.();
  }, [focusApartmentId]);

  useEffect(() => {
    fetchSubwayData()
      .then(setSubwayData)
      .catch(console.error)
      .finally(() => setSubwayLoading(false));
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[40.7489, -73.968]}
        zoom={13}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        zoomControl={false}
      >
        <CartoBasemap />

        {/* Subway lines */}
        {showSubway && subwayData?.lines && (
          <GeoJSON
            key="subway-lines"
            data={subwayData.lines as any}
            style={(feature) => ({
              color: getLineColor(feature?.properties?.service ?? ""),
              weight: 2.5,
              opacity: 0.8,
              smoothFactor: 2,
              lineCap: "round",
              lineJoin: "round",
            })}
          />
        )}

        {/* Subway stations */}
        {showSubway &&
          subwayData?.stations.map((s, i) => (
            <CircleMarker
              key={i}
              center={[s.lat, s.lng]}
              radius={3.5}
              pathOptions={{
                color: getLineColor(s.routes[0] ?? ""),
                fillColor: getLineColor(s.routes[0] ?? ""),
                fillOpacity: 1,
                weight: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                <div
                  style={{ fontFamily: "Figtree, sans-serif", lineHeight: 1.4 }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      marginBottom: s.routes.length ? 4 : 0,
                    }}
                  >
                    {s.name}
                  </div>
                  {s.routes.length > 0 && (
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {s.routes.map((r) => (
                        <span
                          key={r}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: getLineColor(r),
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Whole Foods markers */}
        {showWholeFoods && WHOLE_FOODS_LOCATIONS.map((wf, i) => (
          <Marker key={`wf-${i}`} position={[wf.lat, wf.lng]} icon={wholeFoodsIcon}>
            <Tooltip direction="top" offset={[0, -13]} opacity={0.95}>
              <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, fontWeight: 600 }}>
                🛒 Whole Foods
              </div>
              <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 11, color: "#666" }}>
                {wf.address}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Apartment markers */}
        {apartments.map((apt) => (
          <Marker
            key={apt.id}
            position={[apt.lat, apt.lng]}
            icon={createApartmentIcon(
              apt.tourStatus,
              !isOwner && apt.tourStatus !== 'toured' ? '#9CA3AF' : undefined,
              isOwner,
              selectedId === apt.id
            )}
            eventHandlers={{
              click: () => {
                setSelectedId((prev) => {
                  if (prev === apt.id) return null;
                  const m = mapRef.current;
                  if (m) {
                    const zoom = Math.max(m.getZoom(), 15);
                    flyToApt(m, apt.lat, apt.lng, zoom, isMobile, showList, listExpanded);
                  }
                  return apt.id;
                });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -42]} opacity={0.95}>
              <span className="text-xs font-medium">{shortAddress(apt.address, apt.aptNumber)}</span>
            </Tooltip>
          </Marker>
        ))}

        <MapRefCapture mapRef={mapRef} />
      </MapContainer>

      {/* ── Controls: zoom (desktop only) + subway toggle ── */}
      <div className="absolute bottom-6 right-3 z-[1000] flex flex-col items-end gap-2">

        {/* Zoom buttons — hidden on mobile */}
        <div
          className="hidden sm:flex flex-col overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(26,21,18,0.12)',
          }}
        >
          {[
            { label: '+', action: () => mapRef.current?.zoomIn() },
            { label: '−', action: () => mapRef.current?.zoomOut() },
          ].map(({ label, action }, i) => (
            <button
              key={label}
              onClick={action}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 18, fontWeight: 400, lineHeight: 1,
                color: 'var(--text-2)',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Archived toggle — owner only */}
        {isOwner && (
          <button
            onClick={onToggleShowArchived}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{
              background: showArchived ? "#6B7280" : "var(--surface)",
              color: showArchived ? "#fff" : "var(--text-2)",
              border: `1.5px solid ${showArchived ? "#6B7280" : "var(--border)"}`,
              boxShadow: "0 2px 8px rgba(26,21,18,0.12)",
            }}
          >
            <Archive size={12} />
            {showArchived ? "Archived ON" : "Archived"}
          </button>
        )}

        {/* Whole Foods toggle */}
        <button
          onClick={() => setShowWholeFoods((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
          style={{
            background: showWholeFoods ? "#00674B" : "var(--surface)",
            color: showWholeFoods ? "#fff" : "var(--text-2)",
            border: `1.5px solid ${showWholeFoods ? "#00674B" : "var(--border)"}`,
            boxShadow: "0 2px 8px rgba(26,21,18,0.12)",
          }}
        >
          🛒 {showWholeFoods ? "WF ON" : "WF OFF"}
        </button>

        {/* Subway toggle */}
        <button
          onClick={() => setShowSubway((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
          style={{
            background: showSubway ? "#1D57D8" : "var(--surface)",
            color: showSubway ? "#fff" : "var(--text-2)",
            border: `1.5px solid ${showSubway ? "#1D57D8" : "var(--border)"}`,
            boxShadow: "0 2px 8px rgba(26,21,18,0.12)",
          }}
        >
          {subwayLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Layers size={12} />
          )}
          {subwayLoading
            ? "Loading subway…"
            : showSubway
              ? "Subway ON"
              : "Subway OFF"}
        </button>
      </div>

      {/* ── Empty state ── */}
      {apartments.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
          <div
            className="px-5 py-4 text-center rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 24px rgba(26,21,18,0.10)",
            }}
          >
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-1)", fontFamily: "Syne, sans-serif" }}
            >
              No apartments added yet
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>
              Click "+ Add Apt" to get started
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div
        className="absolute z-[1000]"
        style={{
          bottom: 24,
          left: showList && !listExpanded ? 'calc(450px + 12px)' : 12,
          transition: 'left 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          className="px-3 py-2.5 rounded-xl text-[12px] space-y-1.5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 12px rgba(26,21,18,0.08)",
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-3)" }}
          >
            Apartments
          </p>
          {isOwner ? (
            (["not_contacted", "pending_availability", "upcoming", "toured"] as TourStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                <span style={{ color: "var(--text-2)" }}>
                  {s === "not_contacted" ? "Not contacted"
                    : s === "pending_availability" ? "Tentative"
                    : s === "upcoming" ? "Upcoming tour"
                    : "Toured"}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.toured }} />
                <span style={{ color: "var(--text-2)" }}>Toured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#9CA3AF" }} />
                <span style={{ color: "var(--text-2)" }}>Not yet toured</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Selected apartment panel ── */}
      {selectedApt && (
        <div
          className="panel-enter absolute z-[1000]"
          style={isMobile ? {
            left: 0, right: 0, bottom: 0,
            borderRadius: '18px 18px 0 0',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderBottom: 'none',
            boxShadow: '0 -8px 32px rgba(26,21,18,0.18)',
            height: (reviewEditing || ratingEditing) ? '100%' : (isOwner ? '66%' : '80%'),
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            transition: 'height 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          } : {
            top: 12, right: 12,
            width: 288,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 40px rgba(26,21,18,0.14)',
            maxHeight: 'min(640px, 85vh)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* ── Apt info ── owner: fills panel + scrolls; non-owner: fixed, ReviewSection fills rest ── */}
          <div style={isOwner
            ? { flex: 1, minHeight: 0, overflowY: 'auto' }
            : { flexShrink: 0, overflowY: 'auto' }
          }>

          {/* Mobile drag handle */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
          )}
          {/* Panel header */}
          <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-widest truncate"
                style={{ color: "var(--accent)" }}
              >
                {selectedApt.neighborhood}
              </p>
              <p
                className="text-[14px] font-semibold leading-snug mt-0.5 line-clamp-2"
                style={{ color: "var(--text-1)" }}
              >
                {shortAddress(selectedApt.address, selectedApt.aptNumber)}
              </p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors shrink-0 mt-0.5"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Details */}
          <div className="px-4 pb-3 space-y-2.5">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className="text-[12px] font-medium px-2 py-0.5 rounded"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                }}
              >
                {typeLabel(selectedApt.type)}
              </span>
              {selectedApt.monthlyCost > 0 && (
                <span
                  className="text-[12px] font-semibold px-2 py-0.5 rounded"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent)",
                  }}
                >
                  ${selectedApt.monthlyCost.toLocaleString()}/mo
                </span>
              )}
              {selectedApt.laundry && (
                <span
                  className="text-[12px] font-medium px-2 py-0.5 rounded flex items-center gap-0.5"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-2)",
                  }}
                >
                  <WashingMachine size={10} /> Laundry
                </span>
              )}
            </div>

            {/* Tour status */}
            {isOwner && selectedApt.tourStatus === "upcoming" && selectedApt.tourDate ? (
              <div
                className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <CalendarClock size={12} />
                Tour: {formatDate(selectedApt.tourDate)}
              </div>
            ) : isOwner && selectedApt.tourStatus === "pending_availability" ? (
              <div
                className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: "#FFFBEB", color: "#B45309", border: "1px dashed #F59E0B" }}
              >
                <CalendarClock size={12} />
                {selectedApt.tentativeTourDate
                  ? `Tentative: ${formatDate(selectedApt.tentativeTourDate)}`
                  : "Tentative — no time set"}
              </div>
            ) : selectedApt.tourStatus === "toured" ? (
              <div
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: "#ECFDF5", color: "#16803A" }}
              >
                ✓ Toured
              </div>
            ) : isOwner ? (
              <div
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
              >
                Not yet contacted
              </div>
            ) : null}

            {/* Available date */}
            {selectedApt.availableDate && (
              <div
                className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                }}
              >
                🔑 Available{" "}
                {new Date(
                  selectedApt.availableDate + "T00:00:00",
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}

            {/* Listing image(s) */}
            {(selectedApt.listingImageUrls?.length || selectedApt.listingImageUrl) && (
              <MapListingCarousel
                urls={selectedApt.listingImageUrls ?? (selectedApt.listingImageUrl ? [selectedApt.listingImageUrl] : [])}
                imgHeight={isMobile ? 120 : 140}
              />
            )}

            {/* Notes */}
            {selectedApt.notes && (
              <p
                className="text-[12px] italic line-clamp-2"
                style={{ color: "var(--text-3)" }}
              >
                {selectedApt.notes}
              </p>
            )}

            {/* Actions */}
            <div
              className="flex items-center gap-1 pt-1"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {selectedApt.listingUrl && (
                <a
                  href={selectedApt.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] font-medium transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-3)")
                  }
                >
                  <ExternalLink size={11} /> Listing
                </a>
              )}
              <div className="ml-auto flex gap-1">
                {isOwner && <button
                  onClick={() => {
                    onArchive(selectedApt.id);
                    setSelectedId(null);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md transition-all"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                    e.currentTarget.style.color = "#6B7280";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-3)";
                  }}
                >
                  <Archive size={11} /> Archive
                </button>}
              {isOwner && <button
                  onClick={() => {
                    onEdit(selectedApt);
                    setSelectedId(null);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md transition-all"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-3)";
                  }}
                >
                  <Pencil size={11} /> Edit
                </button>}
                {isOwner && confirmDeleteId === selectedApt.id ? (
                  <>
                    <button
                      onClick={() => {
                        onDelete(selectedApt.id);
                        setSelectedId(null);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1 text-[12px] text-white font-medium rounded"
                      style={{ background: "var(--red)" }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-[12px] font-medium rounded"
                      style={{ color: "var(--text-3)" }}
                    >
                      Cancel
                    </button>
                  </>
                ) : isOwner ? (
                  <button
                    onClick={() => setConfirmDeleteId(selectedApt.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md transition-all"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--red-light)";
                      e.currentTarget.style.color = "var(--red)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-3)";
                    }}
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── Ratings — owner only ── */}
          {isOwner && (
            <ApartmentRatings
              apartment={selectedApt}
              isOwner
              onUpdate={updates => onUpdate(selectedApt.id, updates)}
              onEditingChange={isMobile ? setRatingEditing : undefined}
            />
          )}

          </div>{/* end apt info wrapper */}

          {/* ── Reviews (fills remaining space, scrolls independently) ── */}
          {!isOwner && (
            <ReviewSection
              apartmentId={selectedApt.id}
              isOwner={false}
              onEditingChange={isMobile ? setReviewEditing : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
