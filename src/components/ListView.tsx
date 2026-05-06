import { useState, useEffect } from 'react';
import {
  X, Maximize2, Minimize2, Sun, UtensilsCrossed, WashingMachine,
  ExternalLink, Pencil, Trash2, CalendarClock, CheckCircle2,
  Clock, MessageSquareOff, KeyRound, Users, ArrowUpDown,
  LayoutList, AlignJustify, ImageOff,
} from 'lucide-react';
import { Apartment, TourStatus, Comment } from '../types';
import { shortAddress } from '../utils/address';
import CommentSection from './CommentSection';

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
  isOwner: boolean;
  comments: Comment[];
  onAddComment: (aptId: string, name: string, text: string, rating: number) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
}

const STATUS_CONFIG: Record<TourStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  not_contacted:        { label: 'Not contacted', icon: <MessageSquareOff size={10} />, bg: '#F9F2F1', text: '#B54040', border: '#DC2626' },
  pending_availability: { label: 'Pending AP',    icon: <Users size={10} />,            bg: '#FFF7ED', text: '#C2410C', border: '#EA580C' },
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
  { value: 'pending_availability', label: 'Pending AP' },
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

function ListingImage({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div style={{ margin: '10px -14px', position: 'relative', height: 160, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <img
        src={url}
        alt="Listing"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
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
  isOwner: boolean;
}

function CompactRow({ apt, onEdit, onDelete, confirming, onConfirm, onCancelConfirm, isOwner }: CompactRowProps) {
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

      {/* Rent */}
      {apt.monthlyCost > 0 && (
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          flexShrink: 0, fontVariantNumeric: 'tabular-nums',
        }}>
          ${apt.monthlyCost.toLocaleString()}
        </span>
      )}

      {/* Tour badge */}
      {isOwner ? (
        <>
          {apt.tourStatus === 'upcoming' && apt.tourDate && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, flexShrink: 0, background: '#EBF1FD', color: 'var(--accent)' }}>
              {formatTourDateShort(apt.tourDate)}
            </span>
          )}
          {apt.tourStatus === 'pending_availability' && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, flexShrink: 0, background: '#FFF7ED', color: '#C2410C' }}>
              Pending AP
            </span>
          )}
          {apt.tourStatus === 'toured' && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, flexShrink: 0, background: '#ECFDF5', color: '#16803A' }}>
              Toured
            </span>
          )}
        </>
      ) : (
        apt.tourStatus === 'toured' && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, flexShrink: 0, background: '#ECFDF5', color: '#16803A' }}>
            Toured
          </span>
        )
      )}

      {/* Actions — owner only */}
      {isOwner && (
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
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ListView({ apartments, onEdit, onDelete, show, isExpanded, onClose, onToggleExpand, isOwner, comments, onAddComment, onDeleteComment }: Props) {
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
                isOwner={isOwner}
              />
            ))}
          </div>
        ) : (
          // ── Card view ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(apt => {
              const status    = STATUS_CONFIG[apt.tourStatus];
              const confirming = confirmDeleteId === apt.id;
              const aptComments = comments.filter(c => c.aptId === apt.id);
              const toured    = apt.tourStatus === 'toured';
              const friendBorder = toured ? '#16803A' : 'var(--border-hover)';

              return isOwner ? (
                // ── Owner card (full info) ──
                <div
                  key={apt.id}
                  className="apt-card"
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderLeft: `3px solid ${status.border}`, borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(26,21,18,0.05)', overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', lineHeight: 1.4 }}>
                        {apt.neighborhood}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, flexShrink: 0, background: status.bg, color: status.text }}>
                        {status.icon}{status.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: 'var(--text-1)', margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {shortAddress(apt.address, apt.aptNumber)}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{typeLabel(apt.type)}</span>
                      {apt.monthlyCost > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--accent-light)', color: 'var(--accent)' }}>${apt.monthlyCost.toLocaleString()}/mo</span>}
                      {apt.laundry && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', color: 'var(--text-2)' }}><WashingMachine size={10} /> Laundry</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Sun size={12} style={{ color: 'var(--amber)' }} /><span style={{ fontWeight: 600, color: 'var(--amber)' }}>{apt.sunlight}</span><span style={{ color: 'var(--text-3)' }}>/10</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><UtensilsCrossed size={12} style={{ color: '#EA580C' }} /><span style={{ fontWeight: 600, color: '#EA580C' }}>{apt.kitchenUsable}</span><span style={{ color: 'var(--text-3)' }}>/10</span></span>
                    </div>
                    {apt.listingImageUrl && <ListingImage url={apt.listingImageUrl} />}
                    {apt.availableDate && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}><KeyRound size={11} /> Available {formatAvailDate(apt.availableDate)}</div>}
                    {apt.tourStatus === 'upcoming' && apt.tourDate && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}><CalendarClock size={11} /> Tour: {formatTourDate(apt.tourDate)}</div>}
                    {apt.tourStatus === 'pending_availability' && apt.apAvailability && <div style={{ fontSize: 11, color: '#9A3412', background: '#FFF7ED', padding: '5px 8px', borderRadius: 6, marginBottom: 4 }}><span style={{ fontWeight: 600, color: '#C2410C' }}>AP free: </span>{apt.apAvailability}</div>}
                    {apt.notes && <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-3)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderTop: '1px solid var(--border)', gap: 4 }}>
                    {apt.listingUrl && <a href={apt.listingUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.12s' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}><ExternalLink size={11} /> Listing</a>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      <button onClick={() => onEdit(apt)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}><Pencil size={10} /> Edit</button>
                      {confirming ? (
                        <><button onClick={() => { onDelete(apt.id); setConfirm(null); }} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'var(--red)', color: '#fff' }}>Delete</button><button onClick={() => setConfirm(null)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)' }}>Cancel</button></>
                      ) : (
                        <button onClick={() => setConfirm(apt.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}><Trash2 size={10} /> Delete</button>
                      )}
                    </div>
                  </div>
                  {(() => {
                    const aptComments = comments.filter(c => c.aptId === apt.id);
                    return aptComments.length > 0 ? (
                      <CommentSection aptId={apt.id} comments={aptComments} onAddComment={onAddComment} isOwner={true} onDeleteComment={onDeleteComment} />
                    ) : null;
                  })()}
                </div>
              ) : (
                // ── Friend card (simplified + comments) ──
                <div
                  key={apt.id}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderLeft: `3px solid ${friendBorder}`, borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(26,21,18,0.05)', overflow: 'hidden',
                  }}
                >
                  {/* Listing image at top */}
                  {apt.listingImageUrl && (
                    <div style={{ height: 180, overflow: 'hidden', background: 'var(--surface-2)' }}>
                      <img src={apt.listingImageUrl} alt="Listing" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px' }}>
                    {/* Neighborhood + toured badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', lineHeight: 1.4 }}>
                        {apt.neighborhood}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                        background: toured ? '#ECFDF5' : 'var(--surface-2)',
                        color: toured ? '#16803A' : 'var(--text-3)' }}>
                        {toured ? '✓ Toured' : 'Not yet toured'}
                      </span>
                    </div>
                    {/* Address */}
                    <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: 'var(--text-1)', margin: '0 0 10px' }}>
                      {shortAddress(apt.address, apt.aptNumber)}
                    </p>
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{typeLabel(apt.type)}</span>
                      {apt.monthlyCost > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: 'var(--accent-light)', color: 'var(--accent)' }}>${apt.monthlyCost.toLocaleString()}/mo</span>}
                      {apt.laundry && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', color: 'var(--text-2)' }}><WashingMachine size={10} /> Laundry</span>}
                    </div>
                    {/* Inline ratings */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Sun size={12} style={{ color: 'var(--amber)' }} /><span style={{ fontWeight: 600, color: 'var(--amber)' }}>{apt.sunlight}</span><span style={{ color: 'var(--text-3)' }}>/10</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><UtensilsCrossed size={12} style={{ color: '#EA580C' }} /><span style={{ fontWeight: 600, color: '#EA580C' }}>{apt.kitchenUsable}</span><span style={{ color: 'var(--text-3)' }}>/10</span></span>
                    </div>
                    {apt.availableDate && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}><KeyRound size={11} /> Available {formatAvailDate(apt.availableDate)}</div>}
                    {apt.listingUrl && (
                      <a href={apt.listingUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}><ExternalLink size={11} /> View listing</a>
                    )}
                  </div>
                  {/* Comments */}
                  <CommentSection aptId={apt.id} comments={aptComments} onAddComment={onAddComment} isOwner={isOwner} onDeleteComment={onDeleteComment} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
