import { Map, List, Plus, CalendarDays, Lock, Unlock } from 'lucide-react';
import { AppView } from '../types';

interface Props {
  view: AppView;
  onSetView: (v: AppView) => void;
  onAddApartment: () => void;
  apartmentCount: number;
  isOwner: boolean;
  onAuthClick: () => void;
}

export default function Header({ view, onSetView, onAddApartment, apartmentCount, isOwner, onAuthClick }: Props) {
  const tabs = [
    { v: 'map'      as AppView, icon: <Map size={13} />,          label: 'Map'      },
    { v: 'list'     as AppView, icon: <List size={13} />,         label: 'List'     },
    ...(isOwner
      ? [{ v: 'calendar' as AppView, icon: <CalendarDays size={13} />, label: 'Calendar' }]
      : []),
  ];

  return (
    <header
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 sm:py-4 shrink-0 z-10 relative"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 0 var(--border)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onAuthClick}
          title={isOwner ? 'Owner mode — click to lock' : 'Owner login'}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0 relative transition-opacity"
          style={{ background: 'var(--accent)', fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          NYC
          <span
            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: isOwner ? '#22C55E' : '#9CA3AF' }}
          >
            {isOwner ? <Unlock size={8} color="#fff" /> : <Lock size={8} color="#fff" />}
          </span>
        </button>

        <div className="min-w-0">
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(14px, 4vw, 22px)',
            letterSpacing: '-0.03em',
            color: 'var(--text-1)',
            lineHeight: 1.25,
          }}>
            Eli's Apartment Hunting
            <span style={{ color: 'var(--accent)' }}> in the Concrete Jungle</span>
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
        {tabs.map(({ v, icon, label }) => (
          <button
            key={v}
            onClick={() => onSetView(v)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
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

      {/* Add button — owner only */}
      {isOwner && (
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
      )}
    </header>
  );
}
