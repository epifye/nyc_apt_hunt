import { useState, useEffect, useRef } from 'react';
import { Apartment } from '../types';

const SCALES = [
  { key: 'sunlight'       as const, emoji: '☀️', label: 'Sun'      },
  { key: 'kitchenUsable'  as const, emoji: '🍳', label: 'Kitchen'  },
  { key: 'roominess'      as const, emoji: '📐', label: 'Space'    },
  { key: 'location'       as const, emoji: '📍', label: 'Location' },
  { key: 'transportation' as const, emoji: '🚇', label: 'Transit'  },
  { key: 'likeIt'         as const, emoji: '❤️', label: 'Like it'  },
] as const;

type RatingKey = typeof SCALES[number]['key'];

function scoreColor(s: number): string {
  if (s === 0) return 'var(--text-3)';
  if (s <= 3)  return '#EF4444';
  if (s <= 5)  return '#F59E0B';
  if (s <= 7)  return '#10B981';
  return '#059669';
}

interface Props {
  apartment: Apartment;
  isOwner: boolean;
  onUpdate?: (updates: Partial<Apartment>) => void;
  onEditingChange?: (editing: boolean) => void;
}

export default function ApartmentRatings({ apartment, isOwner, onUpdate, onEditingChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState<Partial<Record<RatingKey, number>>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }, [editing]);

  const get = (key: RatingKey): number => {
    if (key in draft) return draft[key] ?? 0;
    return (apartment[key as keyof Apartment] as number | undefined) ?? 0;
  };

  const openEdit  = () => { setEditing(true);  onEditingChange?.(true);  };
  const closeEdit = () => { setEditing(false); onEditingChange?.(false); };

  const tap = (key: RatingKey, i: number) =>
    setDraft(d => ({ ...d, [key]: get(key) === i ? 0 : i }));

  const save = () => {
    if (onUpdate && Object.keys(draft).length > 0) {
      onUpdate(draft as Partial<Apartment>);
    }
    setDraft({});
    closeEdit();
  };

  const allUnrated = SCALES.every(s => get(s.key) === 0);

  return (
    <div ref={rootRef} style={{ borderTop: '1px solid var(--border)' }}>

      {/* ── Display strip ── */}
      <div
        onClick={() => isOwner && !editing && openEdit()}
        style={{
          display: 'flex', alignItems: 'stretch',
          background: 'var(--surface)',
          cursor: isOwner && !editing ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {SCALES.map(({ key, emoji, label }) => {
          const v = get(key);
          return (
            <div key={key} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, padding: '8px 0 7px',
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
              <span style={{
                fontSize: 11, fontWeight: 800, lineHeight: 1,
                color: scoreColor(v), fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}>
                {v === 0 ? '–' : v}
              </span>
              <span style={{
                fontSize: 7, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Rate affordance ── */}
      {isOwner && !editing && (
        <div
          onClick={openEdit}
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '2px 0 4px',
            background: 'var(--surface)',
            cursor: 'pointer',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{
            fontSize: 8, fontWeight: 700, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {allUnrated ? 'rate' : 'edit'} <span style={{ fontSize: 10 }}>∨</span>
          </span>
        </div>
      )}

      {/* ── Edit panel ── */}
      {editing && (
        <div style={{
          padding: '10px 12px 12px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
          }}>
            Rate this apartment
          </div>

          {SCALES.map(({ key, emoji, label }) => {
            const val = get(key);
            const color = scoreColor(val);
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {/* Label */}
                <div style={{ width: 60, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text-2)',
                    textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2,
                  }}>
                    {label}
                  </span>
                </div>

                {/* Segments 1–10 */}
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {Array.from({ length: 10 }, (_, idx) => {
                    const i = idx + 1;
                    const filled = val > 0 && i <= val;
                    const exact  = i === val;
                    return (
                      <button
                        key={i}
                        onClick={() => tap(key, i)}
                        style={{
                          flex: 1, height: 34, borderRadius: 5, border: 'none',
                          cursor: 'pointer',
                          background: filled ? color : 'var(--surface)',
                          color: filled ? '#fff' : 'var(--text-3)',
                          fontSize: 9, fontWeight: 700,
                          transition: 'background 0.08s',
                          transform: exact ? 'scaleY(1.1)' : 'none',
                          boxShadow: exact ? `0 0 0 2px ${color}` : 'none',
                          position: 'relative', zIndex: exact ? 1 : 0,
                        }}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>

                {/* Score */}
                <div style={{
                  width: 22, flexShrink: 0, textAlign: 'right',
                  fontSize: 13, fontWeight: 800,
                  color: val > 0 ? color : 'var(--text-3)',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em',
                }}>
                  {val === 0 ? '–' : val}
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button
              onClick={save}
              style={{
                flex: 1, padding: '11px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={() => { setDraft({}); closeEdit(); }}
              style={{
                padding: '11px 16px', borderRadius: 10, fontSize: 13,
                background: 'var(--surface)', color: 'var(--text-2)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
