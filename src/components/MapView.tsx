import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Sun,
  UtensilsCrossed,
  WashingMachine,
  CalendarClock,
  Loader2,
  Layers,
} from "lucide-react";
import { Apartment, TourStatus, Comment } from "../types";
import { shortAddress } from "../utils/address";
import { Stars, NAME_KEY } from "./CommentSection";

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

function createApartmentIcon(status: TourStatus, isOwner: boolean): L.DivIcon {
  const color = isOwner
    ? STATUS_COLORS[status]
    : status === 'toured' ? '#16803A' : '#6B7280';
  const badge =
    isOwner && status === "pending_availability"
      ? `<circle cx="23" cy="5" r="6" fill="#fff" stroke="#fff" stroke-width="1"/>
       <circle cx="23" cy="5" r="5" fill="#EA580C"/>
       <text x="23" y="8.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="sans-serif">!</text>`
      : "";
  const svg = `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" class="apt-marker-pin">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28S28 24.5 28 14C28 6.268 21.732 0 14 0z"
      fill="${color}" stroke="white" stroke-width="2.5"/>
    <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.95"/>
    ${badge}
  </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [32, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -44],
  });
}

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

function FlyToApartment({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

// ── Capture map ref ───────────────────────────────────────────────────────────

function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}

// ── Helper formatters ─────────────────────────────────────────────────────────

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
  showList: boolean;
  listExpanded: boolean;
  isOwner: boolean;
  comments: Comment[];
  onAddComment: (aptId: string, name: string, text: string, rating: number) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MapView({ apartments, onEdit, onDelete, showList, listExpanded, isOwner, comments, onAddComment, onDeleteComment }: Props) {
  const [subwayData, setSubwayData] = useState<SubwayData | null>(null);
  const [subwayLoading, setSubwayLoading] = useState(true);
  const [showSubway, setShowSubway] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Hunting call mini-form state
  const [showCallForm, setShowCallForm]     = useState(false);
  const [showCallsList, setShowCallsList]   = useState(false);
  const [callName, setCallName]             = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [callText, setCallText]             = useState('');
  const [callRating, setCallRating]         = useState(0);
  const [callSubmitting, setCallSub]        = useState(false);

  const resetCallForm = () => { setShowCallForm(false); setCallText(''); setCallRating(0); };

  const selectedApt = apartments.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    fetchSubwayData()
      .then(setSubwayData)
      .catch(console.error)
      .finally(() => setSubwayLoading(false));
  }, []);

  useEffect(() => { resetCallForm(); setShowCallsList(false); }, [selectedId]);

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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

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

        {/* Apartment markers */}
        {apartments.map((apt) => (
          <Marker
            key={apt.id}
            position={[apt.lat, apt.lng]}
            icon={createApartmentIcon(apt.tourStatus, isOwner)}
            eventHandlers={{
              click: () =>
                setSelectedId((prev) => (prev === apt.id ? null : apt.id)),
            }}
          >
            <Tooltip direction="top" offset={[0, -42]} opacity={0.95}>
              <span className="text-xs font-medium">{shortAddress(apt.address, apt.aptNumber)}</span>
            </Tooltip>
          </Marker>
        ))}

        {/* Fly to selected */}
        {selectedApt && (
          <FlyToApartment lat={selectedApt.lat} lng={selectedApt.lng} />
        )}

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
        className="absolute bottom-6 z-[1000]"
        style={{
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
                  {s === "not_contacted" ? "Not contacted" : s === "pending_availability" ? "Pending AP" : s === "upcoming" ? "Upcoming tour" : "Toured"}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#16803A' }} />
                <span style={{ color: "var(--text-2)" }}>Toured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6B7280' }} />
                <span style={{ color: "var(--text-2)" }}>Not yet toured</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Selected apartment panel ── */}
      {selectedApt && (
        <div
          className="panel-enter absolute top-3 right-3 z-[1000] w-72 rounded-2xl overflow-hidden"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 40px rgba(26,21,18,0.14)",
          }}
        >
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

            {/* Meters */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sun
                  size={12}
                  style={{ color: "var(--amber)", flexShrink: 0 }}
                />
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedApt.sunlight * 10}%`,
                      background: "var(--amber)",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] tabular-nums w-5 text-right"
                  style={{ color: "var(--text-3)" }}
                >
                  {selectedApt.sunlight}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed
                  size={12}
                  style={{ color: "#EA580C", flexShrink: 0 }}
                />
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedApt.kitchenUsable * 10}%`,
                      background: "#EA580C",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] tabular-nums w-5 text-right"
                  style={{ color: "var(--text-3)" }}
                >
                  {selectedApt.kitchenUsable}
                </span>
              </div>
            </div>

            {/* Tour status */}
            {!isOwner ? (
              <div
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={selectedApt.tourStatus === 'toured'
                  ? { background: '#ECFDF5', color: '#16803A' }
                  : { background: 'var(--surface-2)', color: 'var(--text-3)' }}
              >
                {selectedApt.tourStatus === 'toured' ? '✓ Toured' : 'Not yet toured'}
              </div>
            ) : selectedApt.tourStatus === "upcoming" && selectedApt.tourDate ? (
              <div
                className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                <CalendarClock size={12} />
                Tour: {formatDate(selectedApt.tourDate)}
              </div>
            ) : selectedApt.tourStatus === "pending_availability" ? (
              <div className="space-y-1.5">
                <div
                  className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ background: "#FFF7ED", color: "#C2410C" }}
                >
                  ⚠ Schedule tour — AP is free:
                </div>
                {selectedApt.apAvailability && (
                  <div
                    className="text-[12px] px-2.5 py-1.5 rounded-lg"
                    style={{ background: "#FFF7ED", color: "#9A3412" }}
                  >
                    {selectedApt.apAvailability}
                  </div>
                )}
              </div>
            ) : selectedApt.tourStatus === "toured" ? (
              <div
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: "#ECFDF5", color: "#16803A" }}
              >
                ✓ Toured
              </div>
            ) : (
              <div
                className="text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-3)",
                }}
              >
                Not yet contacted
              </div>
            )}

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

            {/* Listing image */}
            {selectedApt.listingImageUrl && (
              <div style={{ margin: '4px -16px', height: 140, overflow: 'hidden', background: 'var(--surface-2)' }}>
                <img
                  src={selectedApt.listingImageUrl}
                  alt="Listing"
                  onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Notes — owner only */}
            {isOwner && selectedApt.notes && (
              <p
                className="text-[12px] italic line-clamp-2"
                style={{ color: "var(--text-3)" }}
              >
                {selectedApt.notes}
              </p>
            )}

            {/* Hunting call inline form */}
            {showCallForm && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', margin: '0 0 8px' }}>
                  Add hunting call
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input
                    value={callName}
                    onChange={e => { setCallName(e.target.value); localStorage.setItem(NAME_KEY, e.target.value); }}
                    placeholder="Your name"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 7, fontSize: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars value={callRating} onChange={setCallRating} size={17} />
                    {callRating === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>tap to rate</span>}
                  </div>
                  <textarea
                    value={callText}
                    onChange={e => setCallText(e.target.value)}
                    placeholder="What do you think?"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 7, fontSize: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', outline: 'none', resize: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                    <button type="button" onClick={resetCallForm} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>Cancel</button>
                    <button
                      type="button"
                      disabled={callSubmitting || !callName.trim() || !callText.trim() || !callRating}
                      onClick={async () => {
                        if (!selectedApt || !callName.trim() || !callText.trim() || !callRating) return;
                        setCallSub(true);
                        localStorage.setItem(NAME_KEY, callName.trim());
                        await onAddComment(selectedApt.id, callName, callText, callRating);
                        resetCallForm();
                        setCallSub(false);
                      }}
                      style={{ padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', color: '#fff', background: 'var(--accent)', opacity: (callSubmitting || !callName.trim() || !callText.trim() || !callRating) ? 0.5 : 1 }}
                    >
                      {callSubmitting ? 'Submitting…' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hunting calls dropdown */}
            {(() => {
              const aptCalls = comments.filter(c => c.aptId === selectedApt.id);
              if (!showCallsList || aptCalls.length === 0) return null;
              return (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aptCalls.map(c => (
                      <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 7, padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>{c.authorName}</span>
                          <Stars value={c.rating} size={11} />
                          <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>
                            {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => onDeleteComment(c.id)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', padding: 0, flexShrink: 0 }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.45 }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div
              className="flex items-center gap-1 pt-1"
              style={{ borderTop: showCallForm ? 'none' : '1px solid var(--border)' }}
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
              {(() => {
                const aptCalls = comments.filter(c => c.aptId === selectedApt.id);
                return aptCalls.length > 0 ? (
                  <button
                    onClick={() => setShowCallsList(v => !v)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                      border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
                      background: showCallsList ? 'var(--accent)' : 'transparent',
                      color: showCallsList ? '#fff' : 'var(--text-2)',
                      borderColor: showCallsList ? 'var(--accent)' : 'var(--border)',
                    }}
                    onMouseEnter={e => { if (!showCallsList) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}}
                    onMouseLeave={e => { if (!showCallsList) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}}
                  >
                    {aptCalls.length} {aptCalls.length === 1 ? 'call' : 'calls'} {showCallsList ? '▴' : '▾'}
                  </button>
                ) : null;
              })()}
              {!showCallForm && (
                <button
                  onClick={() => setShowCallForm(true)}
                  style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap', marginLeft: selectedApt.listingUrl ? 'auto' : 0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                >
                  + Add hunting call
                </button>
              )}
              {isOwner && <div className={`flex gap-1 ${selectedApt.listingUrl || !showCallForm ? 'ml-auto' : ''}`}>
                <button
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
                </button>
                {confirmDeleteId === selectedApt.id ? (
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
                ) : (
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
                )}
              </div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
