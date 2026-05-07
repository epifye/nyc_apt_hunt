import { useState, useEffect, useMemo, useRef } from 'react';
import { shortAddress } from '../utils/address';
import { X, Maximize2, Minimize2, ChevronLeft, ChevronRight, CalendarDays, Ban, Plus, Trash2 } from 'lucide-react';
import { Apartment, BlockedSlot, TourStatus } from '../types';

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

const STATUS_STYLE: Record<TourStatus, { bg: string; border: string; text: string; subtext: string; dashed?: boolean }> = {
  not_contacted:        { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', subtext: '#B91C1C' },
  pending_availability: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', subtext: '#B45309', dashed: true },
  upcoming:             { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A8A', subtext: '#1D57D8' },
  toured:               { bg: '#F0FDF4', border: '#22C55E', text: '#14532D', subtext: '#16803A' },
};

function parseTourDate(iso: string) {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return { date: m[1], hour: parseInt(m[2]), min: parseInt(m[3]) };
}

function parseHM(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return { hour: h, min: m };
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
  return h < 12? `${h} AM` : `${h - 12} PM`;
}

function formatTime(hour: number, min: number) {
  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1.5px solid var(--border)',
  color: 'var(--text-1)',
  borderRadius: 8,
  padding: '5px 8px',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
};

interface Props {
  apartments: Apartment[];
  onEdit: (apt: Apartment) => void;
  blockedSlots: BlockedSlot[];
  onAddBlockedSlot: (data: Omit<BlockedSlot, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteBlockedSlot: (id: string) => Promise<void>;
  show: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
}

export default function CalendarView({
  apartments, onEdit,
  blockedSlots, onAddBlockedSlot, onDeleteBlockedSlot,
  show, isExpanded, onClose, onToggleExpand,
}: Props) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── events ────────────────────────────────────────────────────────────────

  const calApts = apartments.filter(a => {
    if (a.tourStatus === 'upcoming') return !!(a.tourDate && parseTourDate(a.tourDate));
    if (a.tourStatus === 'pending_availability') return !!(a.tentativeTourDate && parseTourDate(a.tentativeTourDate));
    return false;
  });

  const getEventDate = (a: Apartment) =>
    a.tourStatus === 'pending_availability' ? a.tentativeTourDate! : a.tourDate!;

  // All dates that have either tours or blocked slots
  const allDates = useMemo(() => {
    const dates = new Set([
      ...calApts.map(a => parseTourDate(getEventDate(a))!.date),
      ...blockedSlots.map(s => s.date),
    ]);
    return [...dates].sort();
  }, [calApts, blockedSlots]);

  const defaultIdx = useMemo(() => {
    const today = todayStr();
    const idx = allDates.findIndex(d => d >= today);
    return idx === -1 ? Math.max(0, allDates.length - 1) : idx;
  }, [allDates]);

  const [dayIdx, setDayIdx] = useState(defaultIdx);

  useEffect(() => {
    if (show) setDayIdx(defaultIdx);
  }, [show, defaultIdx]);

  // Scroll to first event when day changes
  useEffect(() => {
    if (!show || !scrollRef.current) return;
    const currentDate = allDates[dayIdx];
    if (!currentDate) return;
    const dayApts = calApts.filter(a => parseTourDate(getEventDate(a))?.date === currentDate);
    if (dayApts.length === 0) return;
    const earliest = Math.min(...dayApts.map(a => {
      const p = parseTourDate(getEventDate(a))!;
      return p.hour * 60 + p.min;
    }));
    const scrollTop = Math.max(0, (earliest - GRID_START_H * 60 - 30) * (HOUR_PX / 60));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' }), 50);
  }, [dayIdx, show]);

  const currentDate = allDates[dayIdx];
  const dayApts = currentDate ? calApts.filter(a => parseTourDate(getEventDate(a))?.date === currentDate) : [];
  const dayBlocked = currentDate ? blockedSlots.filter(s => s.date === currentDate) : [];

  const { weekday, full } = currentDate ? formatDayHeader(currentDate) : { weekday: '', full: '' };
  const isToday = currentDate === todayStr();

  // ── block time form ───────────────────────────────────────────────────────

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockDate,      setBlockDate]      = useState('');
  const [blockStartH,    setBlockStartH]    = useState('09');
  const [blockStartM,    setBlockStartM]    = useState('00');
  const [blockEndH,      setBlockEndH]      = useState('10');
  const [blockEndM,      setBlockEndM]      = useState('00');
  const [blockLabel,     setBlockLabel]     = useState('');
  const [blockSaving,    setBlockSaving]    = useState(false);

  // Pre-fill date when current day changes or form opens
  useEffect(() => {
    if (showBlockForm) setBlockDate(currentDate || todayStr());
  }, [showBlockForm, currentDate]);

  const handleAddBlock = async () => {
    const start = `${blockStartH}:${blockStartM}`;
    const end   = `${blockEndH}:${blockEndM}`;
    if (!blockDate || start >= end) return;
    setBlockSaving(true);
    try {
      await onAddBlockedSlot({
        date: blockDate,
        startTime: start,
        endTime: end,
        label: blockLabel.trim() || undefined,
      });
      // Navigate to that date
      const newIdx = allDates.indexOf(blockDate);
      if (newIdx !== -1) setDayIdx(newIdx);
      setShowBlockForm(false);
      setBlockLabel('');
    } finally {
      setBlockSaving(false);
    }
  };

  const startTotalMin = parseInt(blockStartH) * 60 + parseInt(blockStartM);
  const endTotalMin   = parseInt(blockEndH)   * 60 + parseInt(blockEndM);
  const blockValid    = blockDate && endTotalMin > startTotalMin;

  // ── style helpers ─────────────────────────────────────────────────────────

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
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minOptions  = ['00', '15', '30', '45'];

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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Block time toggle */}
            <button
              onClick={() => setShowBlockForm(v => !v)}
              title="Block unavailable time"
              style={{
                ...iconBtn,
                width: 'auto', padding: '0 8px', gap: 4, fontSize: 12, fontWeight: 600,
                color: showBlockForm ? 'var(--accent)' : 'var(--text-3)',
                background: showBlockForm ? 'var(--accent-light)' : 'transparent',
                borderRadius: 8,
              }}
              onMouseEnter={e => {
                if (!showBlockForm) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }
              }}
              onMouseLeave={e => {
                if (!showBlockForm) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }
              }}
            >
              <Ban size={13} />
              Block
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

        {/* Block time form */}
        {showBlockForm && (
          <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10,
            borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
              Add unavailable block
            </div>

            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', width: 36, flexShrink: 0 }}>Date</span>
              <input
                type="date"
                value={blockDate}
                onChange={e => setBlockDate(e.target.value)}
                style={{ ...selectStyle, flex: 1 }}
              />
            </div>

            {/* Start / End time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', width: 36, flexShrink: 0 }}>From</span>
              <select value={blockStartH} onChange={e => setBlockStartH(e.target.value)} style={selectStyle}>
                {hourOptions.map(h => (
                  <option key={h} value={h}>{formatHour(parseInt(h))}</option>
                ))}
              </select>
              <select value={blockStartM} onChange={e => setBlockStartM(e.target.value)} style={selectStyle}>
                {minOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', width: 36, flexShrink: 0 }}>To</span>
              <select value={blockEndH} onChange={e => setBlockEndH(e.target.value)} style={selectStyle}>
                {hourOptions.map(h => (
                  <option key={h} value={h}>{formatHour(parseInt(h))}</option>
                ))}
              </select>
              <select value={blockEndM} onChange={e => setBlockEndM(e.target.value)} style={selectStyle}>
                {minOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', width: 36, flexShrink: 0 }}>Note</span>
              <input
                type="text"
                value={blockLabel}
                onChange={e => setBlockLabel(e.target.value)}
                placeholder="e.g. Work meeting (optional)"
                style={{ ...selectStyle, flex: 1 }}
              />
            </div>

            {!blockValid && blockDate && (
              <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>End time must be after start time</p>
            )}

            <button
              onClick={handleAddBlock}
              disabled={!blockValid || blockSaving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: blockValid ? 'var(--accent)' : 'var(--border)',
                color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: blockSaving ? 0.6 : 1,
                alignSelf: 'flex-end',
              }}
            >
              <Plus size={13} />
              {blockSaving ? 'Adding…' : 'Add block'}
            </button>
          </div>
        )}

        {/* Day navigation */}
        {allDates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `0 16px ${showBlockForm ? 0 : 12}px`, paddingBottom: 12 }}>
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
              style={navBtn(dayIdx === allDates.length - 1)}
              disabled={dayIdx === allDates.length - 1}
              onClick={() => setDayIdx(i => Math.min(allDates.length - 1, i + 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {allDates.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10 }}>
          <CalendarDays size={36} style={{ color: 'var(--border)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, fontFamily: 'Syne, sans-serif',
            color: 'var(--text-1)', margin: 0 }}>Nothing scheduled</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Set a tour time or block unavailable time above
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
                <div style={{
                  width: TIME_COL_W,
                  flexShrink: 0,
                  paddingRight: 10,
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
                <div style={{
                  flex: 1,
                  borderTop: `1px solid ${i === 0 ? 'transparent' : 'var(--border)'}`,
                  height: '100%',
                  position: 'relative',
                }}>
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

            {/* Blocked slot blocks */}
            {dayBlocked.map(slot => {
              const start = parseHM(slot.startTime);
              const end   = parseHM(slot.endTime);
              const startMin = start.hour * 60 + start.min;
              const endMin   = end.hour   * 60 + end.min;
              const clampedStart = Math.max(GRID_START_H * 60, startMin);
              const clampedEnd   = Math.min(GRID_END_H   * 60, endMin);
              if (clampedEnd <= clampedStart) return null;
              const topPx    = (clampedStart - GRID_START_H * 60) * (HOUR_PX / 60);
              const heightPx = (clampedEnd - clampedStart) * (HOUR_PX / 60);

              return (
                <div
                  key={slot.id}
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: TIME_COL_W + 4,
                    right: 12,
                    height: Math.max(heightPx, 24),
                    background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)',
                    border: '1px solid #d1d5db',
                    borderLeft: '3px solid #9ca3af',
                    borderRadius: '0 8px 8px 0',
                    padding: '4px 8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 3,
                    opacity: 0.9,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', lineHeight: 1.3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {slot.label || 'Unavailable'}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.2 }}>
                      {formatTime(start.hour, start.min)} – {formatTime(end.hour, end.min)}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteBlockedSlot(slot.id)}
                    title="Remove block"
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer',
                      background: 'rgba(0,0,0,0.08)', color: '#6b7280',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#6b7280'; }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}

            {/* Tour event blocks */}
            {dayApts.map(apt => {
              const isTentative = apt.tourStatus === 'pending_availability';
              const parsed = parseTourDate(getEventDate(apt))!;
              const { hour, min } = parsed;
              const clampedH = Math.max(GRID_START_H, Math.min(GRID_END_H - 1, hour));
              const topPx = ((clampedH - GRID_START_H) * 60 + min) * (HOUR_PX / 60);
              const heightPx = DEFAULT_DURATION_MIN * (HOUR_PX / 60);
              const s = STATUS_STYLE[apt.tourStatus];

              return (
                <div
                  key={apt.id}
                  onClick={() => onEdit(apt)}
                  title={isTentative ? 'Tentative — click to confirm' : 'Click to edit'}
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: TIME_COL_W + 4,
                    right: 12,
                    height: heightPx,
                    minHeight: 28,
                    background: s.bg,
                    borderLeft: `3px ${isTentative ? 'dashed' : 'solid'} ${s.border}`,
                    borderRadius: '0 8px 8px 0',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    opacity: isTentative ? 0.85 : 1,
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
                    {formatTime(hour, min)} · {isTentative ? 'Tentative' : apt.neighborhood}
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
