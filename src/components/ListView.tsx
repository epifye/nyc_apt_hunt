import { useState, useEffect } from 'react';
import {
  X, Maximize2, Minimize2, Sun, UtensilsCrossed, WashingMachine,
  ExternalLink, Pencil, Trash2, CalendarClock, CheckCircle2,
  Clock, MessageSquareOff, KeyRound, Users, ArrowUpDown,
  LayoutList, AlignJustify, ImageOff,
} from 'lucide-react';
import { Apartment, TourStatus } from '../types';
import { shortAddress } from '../utils/address';
import ImageLightbox from './ImageLightbox';

type SortKey = 'monthlyCost' | 'sunlight' | 'kitchenUsable' | 'tourDate' | 'neighborhood' | 'createdAt';
type SortDir = 'asc' | 'desc';

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

interface Props {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  onDelete: (id: string) => void;
  show: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
}

const STATUS_CONFIG: Record<TourStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  not_contacted:        { label: 'Not contacted', icon: <MessageSquareOff size={10} />, bg: '#F9F2F1', text: '#B54040', border: '#DC2626' },
  pending_availability: { label: 'Tentative',     icon: <Users size={10} />,            bg: '#FFFBEB', text: '#B45309', border: '#F59E0B' },
  upcoming:             { label: 'Upcoming tour', icon: <Clock size={10} />,             bg: '#EBF1FD', text: '#1D57D8', border: '#1D57D8' },
  toured:               { label: 'Toured',        icon: <CheckCircle2 size={10} />,      bg: '#ECFDF5', text: '#16803A', border: '#16803A' },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'tourDate',      label: 'Tour date' },
  { key: 'createdAt',     label: 'Added' },
  { key: 'monthlyCost',   label: 'Rent' },
  { key: 'sunlight',      label: 'Sunlight' },
  { key: 'kitchenUsable', label: 'Kitchen' },
  { key: 'neighborhood',  label: 'Neighborhood' },
];

const FILTER_OPTIONS: { value: TourStatus | 'all'; label: string }[] = [
  { value: 'all',                  label: 'All' },
  { value: 'not_contacted',        label: 'Not contacted' },
  { value: 'pending_availability', label: 'Tentative' },
  { value: 'upcoming',             label: 'Upcoming' },
  { value: 'toured',               label: 'Toured' },
];

function typeLabel(t: string) {
  return { studio: 'Studio', '1br': '1 BR', '2br': '2 BR', '3br+': '3+ BR' }[t] ?? t;
}

function formatTourDate(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, , mo, d, h, min] = m;
  const hour = parseInt(h);
  return `${parseInt(mo)}/${parseInt(d)}, ${hour % 12 || 12}:${min} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatTourDateShort(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  const [, , mo, d, h, min] = m;
  const hour = parseInt(h);
  return `${parseInt(mo)}/${parseInt(d)} ${hour % 12 || 12}:${min}${hour >= 12 ? 'p' : 'a'}`;
}

function formatAvailDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ListingImage({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  if (!urls.length || failed) return null;
  const hasPrev = idx > 0;
  const hasNext = idx < urls.length - 1;
  return (
    <>
      <div style={{ margin: '10px -14px', position: 'relative', height: 160, background: 'var(--surface-2)', overflow: 'hidden', cursor: 'zoom-in' }}>
        <img
          key={urls[idx]}
          src={urls[idx]}
          alt="Listing"
          onClick={e => { e.stopPropagation(); setLightbox(true); }}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {urls.length > 1 && (
          <>
            {hasPrev && (
              <button
                onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
                style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: 1 }}
              >‹</button>
            )}
            {hasNext && (
              <button
                onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
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

// ── Compact row ───────────────────────────────────────────────────────────────

interface CompactRowProps {
  apt: Apartment;
  onEdit: (apt: Apartment) => void;
  onDelete: (id: string) => void;
  confirming: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}

function CompactRow({ apt, onEdit, onDelete, confirming, onConfirm, onCancelConfirm }: CompactRowProps) {
  const status = STATUS_CONFIG[apt.tourStatus];
  const [hovered, setHovered] = useState(false);

  const actionBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 6, border: 'none',
    cursor: 'pointer', background: 'transparent', transition: 'all 0.1s',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 42,
        borderLeft: `3px solid ${status.border}`,
        borderBottom: '1px solid var(--border)',
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        paddingLeft: 12,
        paddingRight: 8,
        gap: 8,
        transition: 'background 0.1s',
      }}
    >
      {/* Address + neighborhood */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1,
        }}>
          {shortAddress(apt.address, apt.aptNumber)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
          {apt.neighborhood}
        </span>
      </div>

      {/* Rent — fixed-width slot so it always lands in the same column */}
      <span style={{
        width: 56, textAlign: 'right', flexShrink: 0,
        fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums',
      }}>
        {apt.monthlyCost > 0 ? `$${apt.monthlyCost.toLocaleString()}` : ''}
      </span>

      {/* Tour badge — fixed-width slot (empty when no badge) */}
      <div style={{ width: 76, flexShrink: 0 }}>
        {apt.tourStatus === 'upcoming' && apt.tourDate && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
            background: '#EBF1FD', color: 'var(--accent)', whiteSpace: 'nowrap',
          }}>
            {formatTourDateShort(apt.tourDate)}
          </span>
        )}
        {apt.tourStatus === 'pending_availability' && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
            background: '#FFFBEB', color: '#B45309', border: '1px dashed #F59E0B', whiteSpace: 'nowrap',
          }}>
            Tentative
          </span>
        )}
      </div>
      {apt.tourStatus === 'toured' && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, flexShrink: 0,
          background: '#ECFDF5', color: '#16803A',
        }}>
          Toured
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 1, flexShrink: 0, opacity: hovered || confirming ? 1 : 0, transition: 'opacity 0.15s' }}>
        {confirming ? (
          <>
            <button
              onClick={() => { onDelete(apt.id); onCancelConfirm(); }}
              style={{ ...actionBtn, background: 'var(--red)', color: '#fff', width: 'auto', padding: '0 7px', fontSize: 11, fontWeight: 600, borderRadius: 6 }}
            >
              Delete
            </button>
            <button
              onClick={onCancelConfirm}
              style={{ ...actionBtn, color: 'var(--text-3)', fontSize: 11 }}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(apt)}
              style={{ ...actionBtn, color: 'var(--text-3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={onConfirm}
              style={{ ...actionBtn, color: 'var(--text-3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ListView({ apartments, onEdit, onDelete, show, isExpanded, onClose, onToggleExpand }: Props) {
  const isMobile = useIsMobile();
  const [sortKey, setSortKey]         = useState<SortKey>('tourDate');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [filterStatus, setFilter]     = useState<TourStatus | 'all'>('all');
  const [confirmDeleteId, setConfirm] = useState<string | null>(null);
  const [isCompact, setIsCompact]     = useState(false);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...apartments]
    .filter(a => filterStatus === 'all' || a.tourStatus === filterStatus)
    .sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortKey) {
        case 'monthlyCost':   va = a.monthlyCost;               vb = b.monthlyCost; break;
        case 'sunlight':      va = a.sunlight;                  vb = b.sunlight; break;
        case 'kitchenUsable': va = a.kitchenUsable;             vb = b.kitchenUsable; break;
        // Nulls always sort last regardless of direction
        case 'tourDate':      va = a.tourDate || '￿';      vb = b.tourDate || '￿'; break;
        case 'neighborhood':  va = a.neighborhood.toLowerCase(); vb = b.neighborhood.toLowerCase(); break;
        case 'createdAt':     va = a.createdAt;                 vb = b.createdAt; break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s',
  };

  const pillBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
    flexShrink: 0, cursor: 'pointer', border: 'none', transition: 'all 0.12s',
  };

  return (
    <div
      className="list-panel"
      style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: (isMobile || isExpanded) ? '100%' : 'min(450px, 100%)',
        transform: show ? 'translateX(0)' : 'translateX(-100%)',
        pointerEvents: show ? 'auto' : 'none',
        zIndex: 500,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)',
        boxShadow: show && !isExpanded ? '6px 0 28px rgba(26,21,18,0.13)' : 'none',
      }}
    >
      {/* ── Panel header ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

        {/* Title + controls */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 8px', gap: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
            letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            Apartments
          </span>
          {apartments.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500,
              background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20 }}>
              {apartments.length}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            {/* Compact toggle */}
            <button
              onClick={() => setIsCompact(v => !v)}
              style={{ ...iconBtn, color: isCompact ? 'var(--accent)' : 'var(--text-3)',
                background: isCompact ? 'var(--accent-light)' : 'transparent' }}
              title={isCompact ? 'Card view' : 'Compact view'}
              onMouseEnter={e => { if (!isCompact) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}}
              onMouseLeave={e => { if (!isCompact) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}}
            >
              {isCompact ? <LayoutList size={14} /> : <AlignJustify size={14} />}
            </button>

            {!isMobile && (
              <button
                onClick={onToggleExpand} style={iconBtn} title={isExpanded ? 'Collapse' : 'Full screen'}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            <button
              onClick={onClose} style={iconBtn} title="Close"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Sort pills */}
        <div className="pills-scroll" style={{ padding: '0 14px 5px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
            letterSpacing: '0.07em', flexShrink: 0, marginRight: 3, lineHeight: '24px' }}>Sort</span>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key} onClick={() => handleSort(key)}
              style={{ ...pillBase,
                background: sortKey === key ? 'var(--accent)' : 'var(--surface-2)',
                color: sortKey === key ? '#fff' : 'var(--text-2)',
              }}
            >
              {label}
              {sortKey === key && <ArrowUpDown size={9} style={{ transform: sortDir === 'desc' ? 'scaleY(-1)' : 'none' }} />}
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="pills-scroll" style={{ padding: '0 14px 10px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
            letterSpacing: '0.07em', flexShrink: 0, marginRight: 3, lineHeight: '24px' }}>Filter</span>
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value} onClick={() => setFilter(value)}
              style={{ ...pillBase,
                background: filterStatus === value ? 'var(--text-1)' : 'var(--surface-2)',
                color: filterStatus === value ? '#fff' : 'var(--text-2)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card / Compact list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isCompact ? 0 : '12px' }}>
        {apartments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 10 }}>
            <span style={{ fontSize: 40 }}>🏙️</span>
            <p style={{ fontSize: 14, fontWeight: 600, fontFamily: 'Syne, sans-serif',
              color: 'var(--text-1)', margin: 0 }}>No apartments yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Click "+ Add Apt" to start tracking</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 80, fontSize: 13, color: 'var(--text-3)' }}>
            No apartments match this filter.
          </div>
        ) : isCompact ? (
          // ── Compact rows ──
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {sorted.map(apt => (
              <CompactRow
                key={apt.id}
                apt={apt}
                onEdit={onEdit}
                onDelete={onDelete}
                confirming={confirmDeleteId === apt.id}
                onConfirm={() => setConfirm(apt.id)}
                onCancelConfirm={() => setConfirm(null)}
              />
            ))}
          </div>
        ) : (
          // ── Card view ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(apt => {
              const status = STATUS_CONFIG[apt.tourStatus];
              const confirming = confirmDeleteId === apt.id;
              return (
                <div
                  key={apt.id}
                  className="apt-card"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${status.border}`,
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(26,21,18,0.05)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 14px' }}>

                    {/* Neighborhood + status badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--accent)', lineHeight: 1.4 }}>
                        {apt.neighborhood}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
                        fontWeight: 500, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                        background: status.bg, color: status.text }}>
                        {status.icon}{status.label}
                      </span>
                    </div>

                    {/* Address */}
                    <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: 'var(--text-1)',
                      margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {shortAddress(apt.address, apt.aptNumber)}
                    </p>

                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                        {typeLabel(apt.type)}
                      </span>
                      {apt.monthlyCost > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                          background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          ${apt.monthlyCost.toLocaleString()}/mo
                        </span>
                      )}
                      {apt.laundry && (
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, display: 'flex',
                          alignItems: 'center', gap: 4, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                          <WashingMachine size={10} /> Laundry
                        </span>
                      )}
                    </div>

                    {/* Inline ratings */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                        <Sun size={12} style={{ color: 'var(--amber)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--amber)' }}>{apt.sunlight}</span>
                        <span style={{ color: 'var(--text-3)' }}>/10</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                        <UtensilsCrossed size={12} style={{ color: '#EA580C' }} />
                        <span style={{ fontWeight: 600, color: '#EA580C' }}>{apt.kitchenUsable}</span>
                        <span style={{ color: 'var(--text-3)' }}>/10</span>
                      </span>
                    </div>

                    {/* Listing image */}
                    {(apt.listingImageUrls?.length || apt.listingImageUrl) && (
                      <ListingImage urls={apt.listingImageUrls ?? (apt.listingImageUrl ? [apt.listingImageUrl] : [])} />
                    )}

                    {/* Available date */}
                    {apt.availableDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                        color: 'var(--text-2)', marginBottom: 4 }}>
                        <KeyRound size={11} /> Available {formatAvailDate(apt.availableDate)}
                      </div>
                    )}

                    {/* Tour date */}
                    {apt.tourStatus === 'upcoming' && apt.tourDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                        color: 'var(--accent)', marginBottom: 4 }}>
                        <CalendarClock size={11} /> Tour: {formatTourDate(apt.tourDate)}
                      </div>
                    )}

                    {/* Tentative tour */}
                    {apt.tourStatus === 'pending_availability' && apt.tentativeTourDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                        color: '#B45309', marginBottom: 4 }}>
                        <CalendarClock size={11} /> Tentative: {formatTourDate(apt.tentativeTourDate)}
                      </div>
                    )}

                    {/* Notes */}
                    {apt.notes && (
                      <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-3)',
                        margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {apt.notes}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px',
                    borderTop: '1px solid var(--border)', gap: 4 }}>
                    {apt.listingUrl && (
                      <a
                        href={apt.listingUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                          fontWeight: 500, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                      >
                        <ExternalLink size={11} /> Listing
                      </a>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      <button
                        onClick={() => onEdit(apt)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                          borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                          background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
                      >
                        <Pencil size={10} /> Edit
                      </button>
                      {confirming ? (
                        <>
                          <button
                            onClick={() => { onDelete(apt.id); setConfirm(null); }}
                            style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              border: 'none', cursor: 'pointer', background: 'var(--red)', color: '#fff' }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirm(null)}
                            style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, border: 'none',
                              cursor: 'pointer', background: 'transparent', color: 'var(--text-3)' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirm(apt.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                            borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                            background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
