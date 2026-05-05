import { useState } from 'react';
import {
  ArrowUpDown, Sun, UtensilsCrossed, WashingMachine,
  ExternalLink, Pencil, Trash2, CalendarClock,
  CheckCircle2, Clock, MessageSquareOff, KeyRound,
} from 'lucide-react';
import { Apartment, TourStatus } from '../types';

type SortKey = 'monthlyCost' | 'sunlight' | 'kitchenUsable' | 'tourDate' | 'neighborhood' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface Props {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<TourStatus, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}> = {
  not_contacted: {
    label: 'Not contacted',
    icon: <MessageSquareOff size={11} />,
    bg: '#F9F2F1',
    text: '#B54040',
    border: '#DC2626',
  },
  upcoming: {
    label: 'Upcoming tour',
    icon: <Clock size={11} />,
    bg: '#EBF1FD',
    text: '#1D57D8',
    border: '#1D57D8',
  },
  toured: {
    label: 'Toured',
    icon: <CheckCircle2 size={11} />,
    bg: '#ECFDF5',
    text: '#16803A',
    border: '#16803A',
  },
};

function typeLabel(t: string) {
  return { studio: 'Studio', '1br': '1 BR', '2br': '2 BR', '3br+': '3+ BR' }[t] ?? t;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

function RatingBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 10}%`, background: color }} />
      </div>
      <span className="text-[11px] font-medium tabular-nums w-5 text-right" style={{ color: 'var(--text-3)' }}>
        {value}
      </span>
    </div>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'monthlyCost', label: 'Rent' },
  { key: 'sunlight', label: 'Sunlight' },
  { key: 'kitchenUsable', label: 'Kitchen' },
  { key: 'tourDate', label: 'Tour Date' },
  { key: 'neighborhood', label: 'Neighborhood' },
  { key: 'createdAt', label: 'Added' },
];

export default function ListView({ apartments, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStatus, setFilterStatus] = useState<TourStatus | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...apartments]
    .filter(a => filterStatus === 'all' || a.tourStatus === filterStatus)
    .sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortKey) {
        case 'monthlyCost':   va = a.monthlyCost;              vb = b.monthlyCost; break;
        case 'sunlight':      va = a.sunlight;                 vb = b.sunlight; break;
        case 'kitchenUsable': va = a.kitchenUsable;            vb = b.kitchenUsable; break;
        case 'tourDate':      va = a.tourDate ?? '';            vb = b.tourDate ?? ''; break;
        case 'neighborhood':  va = a.neighborhood.toLowerCase(); vb = b.neighborhood.toLowerCase(); break;
        case 'createdAt':     va = a.createdAt;                vb = b.createdAt; break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  if (apartments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg)' }}>
        <div className="text-5xl">🏙️</div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'Syne, sans-serif' }}>
          No apartments yet
        </p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Click "+ Add Apt" to start tracking listings
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Controls bar */}
      <div
        className="px-5 py-2.5 flex flex-wrap items-center gap-2 shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: 'var(--text-3)' }}>
          Sort
        </span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
            style={
              sortKey === key
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface-2)', color: 'var(--text-2)' }
            }
          >
            {label}
            {sortKey === key && (
              <ArrowUpDown size={9} style={{ transform: sortDir === 'desc' ? 'scaleY(-1)' : 'none' }} />
            )}
          </button>
        ))}

        <div className="ml-auto flex gap-1.5 items-center">
          <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: 'var(--text-3)' }}>
            Filter
          </span>
          {(['all', 'not_contacted', 'upcoming', 'toured'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
              style={
                filterStatus === s
                  ? { background: 'var(--text-1)', color: '#fff' }
                  : { background: 'var(--surface-2)', color: 'var(--text-2)' }
              }
            >
              {s === 'all' ? 'All' : s === 'not_contacted' ? 'Not contacted' : s === 'upcoming' ? 'Upcoming' : 'Toured'}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-5">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm" style={{ color: 'var(--text-3)' }}>
            No apartments match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map(apt => {
              const status = STATUS_CONFIG[apt.tourStatus];
              const confirming = confirmDeleteId === apt.id;
              return (
                <div
                  key={apt.id}
                  className="apt-card rounded-xl overflow-hidden flex flex-col"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${status.border}`,
                    boxShadow: '0 1px 4px rgba(26,21,18,0.05)',
                  }}
                >
                  {/* Card body */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Top: neighborhood + status */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest truncate"
                        style={{ color: 'var(--accent)' }}
                      >
                        {apt.neighborhood}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: status.bg, color: status.text }}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-[14px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-1)' }}>
                      {apt.address}
                    </p>

                    {/* Key metrics row */}
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="text-[12px] font-medium px-2 py-0.5 rounded"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                      >
                        {typeLabel(apt.type)}
                      </span>
                      {apt.monthlyCost > 0 && (
                        <span
                          className="text-[12px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                          ${apt.monthlyCost.toLocaleString()}/mo
                        </span>
                      )}
                      {apt.laundry && (
                        <span
                          className="text-[12px] font-medium px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                        >
                          <WashingMachine size={10} /> Laundry
                        </span>
                      )}
                    </div>

                    {/* Rating bars */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Sun size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                        <RatingBar value={apt.sunlight} color="var(--amber)" />
                      </div>
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed size={12} style={{ color: '#EA580C', flexShrink: 0 }} />
                        <RatingBar value={apt.kitchenUsable} color="#EA580C" />
                      </div>
                    </div>

                    {/* Available date */}
                    {apt.availableDate && (
                      <div
                        className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                      >
                        <KeyRound size={12} />
                        Available {new Date(apt.availableDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    {/* Tour date */}
                    {apt.tourStatus === 'upcoming' && apt.tourDate && (
                      <div
                        className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                      >
                        <CalendarClock size={12} />
                        {formatDate(apt.tourDate)} EST
                      </div>
                    )}

                    {/* Notes */}
                    {apt.notes && (
                      <p className="text-[12px] italic line-clamp-2" style={{ color: 'var(--text-3)' }}>
                        {apt.notes}
                      </p>
                    )}
                  </div>

                  {/* Card footer */}
                  <div
                    className="flex items-center gap-1 px-3 py-2"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    {apt.listingUrl && (
                      <a
                        href={apt.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                      >
                        <ExternalLink size={11} /> Listing
                      </a>
                    )}
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        onClick={() => onEdit(apt)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-medium transition-all"
                        style={{ color: 'var(--text-3)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      {confirming ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { onDelete(apt.id); setConfirmDeleteId(null); }}
                            className="px-2 py-1 rounded text-[12px] text-white font-medium"
                            style={{ background: 'var(--red)' }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded text-[12px] font-medium"
                            style={{ color: 'var(--text-3)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(apt.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] font-medium transition-all"
                          style={{ color: 'var(--text-3)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
                        >
                          <Trash2 size={11} /> Delete
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
