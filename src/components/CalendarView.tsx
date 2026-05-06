import { useState, useEffect, useMemo, useRef } from 'react';
import { shortAddress } from '../utils/address';
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Apartment, TourStatus } from '../types';

const GRID_START_H = 8;   // 8am
const GRID_END_H   = 21;  // 9pm
const HOUR_PX      = 72;  // pixels per hour
const DEFAULT_DURATION_MIN = 30;
const TIME_COL_W   = 52;

function useIsMobile() {
  const [v, setV] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return v;
}

const STATUS_STYLE: Record<TourStatus, { bg: string; border: string; text: string; subtext: string }> = {
  not_contacted:        { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', subtext: '#B91C1C' },
  pending_availability: { bg: '#FFF7ED', border: '#F97316', text: '#9A3412', subtext: '#C2410C' },
  upcoming:             { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A8A', subtext: '#1D57D8' },
  toured:               { bg: '#F0FDF4', border: '#22C55E', text: '#14532D', subtext: '#16803A' },
};

function parseTourDate(iso: string) {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { date: m[1], hour: parseInt(m[2]), min: parseInt(m[3]) };
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    full: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

function formatHour(h: number) {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatTime(hour: number, min: number) {
  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  show: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
}

export default function CalendarView({ apartments, onEdit, show, isExpanded, onClose, onToggleExpand }: Props) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const tourApts = apartments.filter(a => a.tourDate && parseTourDate(a.tourDate));

  const tourDates = useMemo(() => {
    const dates = new Set(tourApts.map(a => parseTourDate(a.tourDate!)!.date));
    return [...dates].sort();
  }, [tourApts]);

  const defaultIdx = useMemo(() => {
    const today = todayStr();
    const idx = tourDates.findIndex(d => d >= today);
    return idx === -1 ? Math.max(0, tourDates.length - 1) : idx;
  }, [tourDates]);

  const [dayIdx, setDayIdx] = useState(defaultIdx);

  // Reset to upcoming day whenever panel opens
  useEffect(() => {
    if (show) setDayIdx(defaultIdx);
  }, [show, defaultIdx]);

  // Scroll to first event when day changes
  useEffect(() => {
    if (!show || !scrollRef.current) return;
    const currentDate = tourDates[dayIdx];
    if (!currentDate) return;
    const dayApts = tourApts.filter(a => parseTourDate(a.tourDate!)?.date === currentDate);
    if (dayApts.length === 0) return;
    const earliest = Math.min(...dayApts.map(a => {
      const p = parseTourDate(a.tourDate!)!;
      return p.hour * 60 + p.min;
    }));
    const scrollTop = Math.max(0, (earliest - GRID_START_H * 60 - 30) * (HOUR_PX / 60));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' }), 50);
  }, [dayIdx, show]);

  const currentDate = tourDates[dayIdx];
  const dayApts = currentDate
    ? tourApts.filter(a => parseTourDate(a.tourDate!)?.date === currentDate)
    : [];

  const { weekday, full } = currentDate ? formatDayHeader(currentDate) : { weekday: '', full: '' };
  const isToday = currentDate === todayStr();

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--text-3)', transition: 'all 0.12s',
  };

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
    cursor: disabled ? 'default' : 'pointer',
    background: 'var(--surface)',
    color: disabled ? 'var(--border)' : 'var(--text-2)',
    transition: 'all 0.12s',
    opacity: disabled ? 0.4 : 1,
  });

  const totalGridH = (GRID_END_H - GRID_START_H) * HOUR_PX;
  const hours = Array.from({ length: GRID_END_H - GRID_START_H }, (_, i) => GRID_START_H + i);

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

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', gap: 8 }}>
          <CalendarDays size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
            letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            Tour Schedule
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
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

        {/* Day navigation */}
        {tourDates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 12px' }}>
            <button
              style={navBtn(dayIdx === 0)}
              disabled={dayIdx === 0}
              onClick={() => setDayIdx(i => Math.max(0, i - 1))}
            >
              <ChevronLeft size={15} />
            </button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14,
                  color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                  {weekday}
                </span>
                {isToday && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                    background: 'var(--accent)', color: '#fff' }}>
                    Today
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{full}</div>
            </div>

            <button
              style={navBtn(dayIdx === tourDates.length - 1)}
              disabled={dayIdx === tourDates.length - 1}
              onClick={() => setDayIdx(i => Math.min(tourDates.length - 1, i + 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {tourDates.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10 }}>
          <CalendarDays size={36} style={{ color: 'var(--border)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, fontFamily: 'Syne, sans-serif',
            color: 'var(--text-1)', margin: 0 }}>No tours scheduled</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Set an apartment's status to "Upcoming" with a tour time
          </p>
        </div>
      ) : (
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ position: 'relative', height: totalGridH, margin: '8px 0' }}>

            {/* Hour rows */}
            {hours.map((h, i) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: i * HOUR_PX,
                  left: 0, right: 0,
                  height: HOUR_PX,
                  display: 'flex',
                  alignItems: 'flex-start',
                }}
              >
                {/* Time label */}
                <div style={{
                  width: TIME_COL_W,
                  flexShrink: 0,
                  paddingRight: 10,
                  paddingTop: i === 0 ? 0 : -6,
                  textAlign: 'right',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-3)',
                  lineHeight: 1,
                  transform: 'translateY(-6px)',
                  userSelect: 'none',
                }}>
                  {i === 0 ? '' : formatHour(h)}
                </div>
                {/* Hour line */}
                <div style={{
                  flex: 1,
                  borderTop: `1px solid ${i === 0 ? 'transparent' : 'var(--border)'}`,
                  height: '100%',
                  position: 'relative',
                }}>
                  {/* Half-hour tick */}
                  <div style={{
                    position: 'absolute',
                    top: HOUR_PX / 2,
                    left: 0, right: 0,
                    borderTop: '1px dashed var(--border)',
                    opacity: 0.5,
                  }} />
                </div>
              </div>
            ))}

            {/* Current time indicator */}
            {isToday && (() => {
              const now = new Date();
              const h = now.getHours(), m = now.getMinutes();
              if (h < GRID_START_H || h >= GRID_END_H) return null;
              const topPx = ((h - GRID_START_H) * 60 + m) * (HOUR_PX / 60);
              return (
                <div style={{ position: 'absolute', top: topPx, left: TIME_COL_W, right: 0, zIndex: 10,
                  display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
                    marginLeft: -4, flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 2, background: '#EF4444', opacity: 0.8 }} />
                </div>
              );
            })()}

            {/* Event blocks */}
            {dayApts.map(apt => {
              const parsed = parseTourDate(apt.tourDate!)!;
              const { hour, min } = parsed;
              const clampedH = Math.max(GRID_START_H, Math.min(GRID_END_H - 1, hour));
              const topPx = ((clampedH - GRID_START_H) * 60 + min) * (HOUR_PX / 60);
              const heightPx = DEFAULT_DURATION_MIN * (HOUR_PX / 60);
              const s = STATUS_STYLE[apt.tourStatus];

              return (
                <div
                  key={apt.id}
                  onClick={() => onEdit(apt)}
                  title="Click to edit"
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: TIME_COL_W + 4,
                    right: 12,
                    height: heightPx,
                    minHeight: 28,
                    background: s.bg,
                    borderLeft: `3px solid ${s.border}`,
                    borderRadius: '0 8px 8px 0',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    zIndex: 5,
                    transition: 'filter 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.95)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = '')}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: s.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {shortAddress(apt.address, apt.aptNumber)}
                  </div>
                  <div style={{ fontSize: 11, color: s.subtext, lineHeight: 1.2 }}>
                    {formatTime(hour, min)} · {apt.neighborhood}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
