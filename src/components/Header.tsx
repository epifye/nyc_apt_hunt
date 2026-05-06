import { Map, List, Plus, CalendarDays } from 'lucide-react';
import { AppView } from '../types';

interface Props {
  view: AppView;
  onSetView: (v: AppView) => void;
  onAddApartment: () => void;
  apartmentCount: number;
}

export default function Header({ view, onSetView, onAddApartment, apartmentCount }: Props) {
  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 sm:py-4 shrink-0 z-10 relative"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 0 var(--border)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0"
          style={{ background: 'var(--accent)', fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}
        >
          NYC
        </div>
        <div className="min-w-0">
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em', color: 'var(--text-1)', lineHeight: 1.25 }}>
            Eli's Apartment Hunting in the Concrete Jungle
          </span>
          {apartmentCount > 0 && (
            <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ml-2" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
              {apartmentCount} saved
            </span>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex p-1 gap-0.5 rounded-full shrink-0" style={{ background: 'var(--surface-2)' }}>
        {([
          { v: 'map'      as AppView, icon: <Map size={13} />,         label: 'Map'      },
          { v: 'list'     as AppView, icon: <List size={13} />,        label: 'List'     },
          { v: 'calendar' as AppView, icon: <CalendarDays size={13} />, label: 'Calendar' },
        ]).map(({ v, icon, label }) => (
          <button
            key={v}
            onClick={() => onSetView(v)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all"
            style={
              view === v
                ? { background: 'var(--surface)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(26,21,18,0.10)' }
                : { color: 'var(--text-2)' }
            }
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAddApartment}
        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-white text-[13px] font-semibold transition-colors shrink-0"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
      >
        <Plus size={14} strokeWidth={2.5} />
        <span className="hidden sm:inline">Add Apt</span>
      </button>
    </header>
  );
}
